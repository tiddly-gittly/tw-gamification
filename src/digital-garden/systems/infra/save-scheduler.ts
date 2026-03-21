/**
 * SaveScheduler — debounced, priority-aware tiddler write-back.
 *
 * Priority levels:
 *   'immediate'  — flush on next microtask (wallet changes, blueprint unlock)
 *   'soon'       — flush within 500 ms (building placement, operation toggle)
 *   'lazy'       — flush within 5 s (world state, camera, resident snapshots)
 *
 * All writes are batched: multiple schedule() calls within the window
 * result in a single tiddler write.
 *
 * PLAN Phase 2 — infra layer
 */

import type { GardenWorldGridData } from '../../types/map-types';
import type { GardenWorldObjectRecord } from '../../types/resident-types';
import type { GardenGlobalSave, GardenWorldIndexItem } from '../../types/save-types';
import type { GardenWorldMeta, GardenWorldState } from '../../types/world-types';
import type { TiddlerRepository } from './tiddler-repository';

type Priority = 'immediate' | 'soon' | 'lazy';
type WriteKey = 'globalSave' | 'worldIndex' | `worldMeta:${string}` | `worldGrid:${string}` | `worldObjects:${string}` | `worldState:${string}`;

const DELAY: Record<Priority, number> = { immediate: 0, soon: 500, lazy: 5000 };

export class SaveScheduler {
  private readonly repo: TiddlerRepository;
  private pending = new Map<WriteKey, { priority: Priority; data: unknown; timer: ReturnType<typeof setTimeout> | undefined }>();
  private flushing = false;

  constructor(repo: TiddlerRepository) {
    this.repo = repo;
  }

  scheduleGlobalSave(save: GardenGlobalSave, priority: Priority = 'soon'): void {
    this.schedule('globalSave', save, priority);
  }

  scheduleWorldIndex(items: GardenWorldIndexItem[], priority: Priority = 'soon'): void {
    this.schedule('worldIndex', items, priority);
  }

  scheduleWorldMeta(worldId: string, meta: GardenWorldMeta, priority: Priority = 'soon'): void {
    this.schedule(`worldMeta:${worldId}`, meta, priority);
  }

  scheduleWorldGrid(worldId: string, grid: GardenWorldGridData, priority: Priority = 'lazy'): void {
    this.schedule(`worldGrid:${worldId}`, grid, priority);
  }

  scheduleWorldObjects(worldId: string, record: GardenWorldObjectRecord, priority: Priority = 'soon'): void {
    this.schedule(`worldObjects:${worldId}`, record, priority);
  }

  scheduleWorldState(worldId: string, state: GardenWorldState, priority: Priority = 'lazy'): void {
    this.schedule(`worldState:${worldId}`, state, priority);
  }

  /** Force all pending writes to execute immediately */
  async flush(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    try {
      for (const [key, entry] of this.pending) {
        if (entry.timer !== undefined) clearTimeout(entry.timer);
        this.executeWrite(key, entry.data);
      }
      this.pending.clear();
    } finally {
      this.flushing = false;
    }
  }

  destroy(): void {
    for (const entry of this.pending.values()) {
      if (entry.timer !== undefined) clearTimeout(entry.timer);
    }
    this.pending.clear();
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private schedule(key: WriteKey, data: unknown, priority: Priority): void {
    const existing = this.pending.get(key);

    // If already scheduled at equal or higher priority, just update data
    const existingPriority = existing?.priority;
    const shouldUpgrade = !existingPriority || DELAY[priority] <= DELAY[existingPriority];

    if (existing?.timer !== undefined) clearTimeout(existing.timer);

    const delay = DELAY[shouldUpgrade ? priority : existingPriority];
    const timer = delay === 0
      ? (Promise.resolve().then(() => {
        this.executeAndClear(key);
      }) as unknown as ReturnType<typeof setTimeout>)
      : setTimeout(() => {
        this.executeAndClear(key);
      }, delay);

    this.pending.set(key, { priority: shouldUpgrade ? priority : existingPriority, data, timer });
  }

  private executeAndClear(key: WriteKey): void {
    const entry = this.pending.get(key);
    if (!entry) return;
    this.executeWrite(key, entry.data);
    this.pending.delete(key);
  }

  private executeWrite(key: WriteKey, data: unknown): void {
    try {
      if (key === 'globalSave') {
        this.repo.writeGlobalSave(data as GardenGlobalSave);
        return;
      }
      if (key === 'worldIndex') {
        this.repo.writeWorldIndex(data as GardenWorldIndexItem[]);
        return;
      }
      const [type, worldId] = key.split(':') as [string, string];
      if (type === 'worldMeta') this.repo.writeWorldMeta(data as GardenWorldMeta);
      else if (type === 'worldGrid') this.repo.writeWorldGrid(worldId, data as GardenWorldGridData);
      else if (type === 'worldObjects') this.repo.writeWorldObjects(worldId, data as GardenWorldObjectRecord);
      else if (type === 'worldState') this.repo.writeWorldState(worldId, data as GardenWorldState);
    } catch (error) {
      console.error(`[DigitalGarden] SaveScheduler write failed for key "${key}":`, error);
    }
  }
}
