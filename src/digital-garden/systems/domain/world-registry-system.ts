/**
 * WorldRegistrySystem — manages the list of worlds, creation, and switching.
 *
 * Responsibilities:
 * - Read/write the world index tiddler
 * - Create a new world instance from a template
 * - Switch the active world (flush save → destroy runtime → reload)
 *
 * PLAN Phase 2 — domain layer
 */

import type { GardenWorldTemplateDefinition } from '../../types/content-types';
import type { GardenWorldGridData } from '../../types/map-types';
import type { GardenWorldObjectRecord } from '../../types/resident-types';
import type { GardenWorldIndexItem } from '../../types/save-types';
import type { GardenWorldMeta } from '../../types/world-types';
import type { SaveScheduler } from '../infra/save-scheduler';
import type { TiddlerRepository } from '../infra/tiddler-repository';
import type { EconomySystem } from './economy-system';

export class WorldRegistrySystem {
  private index: GardenWorldIndexItem[] = [];

  constructor(
    private readonly repo: TiddlerRepository,
    private readonly scheduler: SaveScheduler,
    private readonly economy: EconomySystem,
  ) {}

  init(): void {
    this.index = this.repo.readWorldIndex();
    if (this.index.length === 0) {
      this.ensureFlatWorldExists();
    }
  }

  getAll(): GardenWorldIndexItem[] {
    return [...this.index];
  }

  getById(worldId: string): GardenWorldIndexItem | undefined {
    return this.index.find(w => w.id === worldId);
  }

  isUnlocked(worldId: string): boolean {
    return this.economy.isWorldUnlocked(worldId);
  }

  /**
   * Create a new world from a template and persist the initial data.
   * Returns the new world id.
   */
  createWorld(template: GardenWorldTemplateDefinition, name: string): string {
    const worldId = `world-${Date.now()}`;

    const meta: GardenWorldMeta = {
      id: worldId,
      name,
      templateId: template.id,
      width: template.defaultWidth,
      height: template.defaultHeight,
      weatherTheme: 'clear',
      ambientAudioKey: template.ambientAudioKey,
      roofVisibilityStrategy: 'auto',
    };

    const grid: GardenWorldGridData = this.generateGrid(template);
    const objects: GardenWorldObjectRecord = { buildings: [], decorations: [], doors: [], roofGroups: [], interiorZones: [], residents: [] };

    this.repo.writeWorldMeta(meta);
    this.scheduler.scheduleWorldGrid(worldId, grid, 'soon');
    this.scheduler.scheduleWorldObjects(worldId, objects, 'soon');

    const entry: GardenWorldIndexItem = {
      id: worldId,
      templateId: template.id,
      name,
      unlocked: true,
      created: Date.now(),
      lastVisited: 0,
      sortWeight: this.index.length,
    };
    this.index.push(entry);
    this.scheduler.scheduleWorldIndex(this.index, 'soon');

    return worldId;
  }

  markVisited(worldId: string): void {
    const entry = this.index.find(w => w.id === worldId);
    if (entry) {
      entry.lastVisited = Date.now();
      this.scheduler.scheduleWorldIndex(this.index, 'lazy');
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private ensureFlatWorldExists(): void {
    // The flat world template is defined in the plugin shadow tiddlers.
    // For the initial bootstrap, we create the flat world directly.
    const flatWorldId = 'world-flat-default';
    const meta: GardenWorldMeta = {
      id: flatWorldId,
      name: '超平坦世界',
      templateId: 'flat-world',
      width: 32,
      height: 32,
      weatherTheme: 'clear',
      ambientAudioKey: 'ambient-birds',
      roofVisibilityStrategy: 'auto',
    };
    const grid = this.generateFlatGrid(32, 32);
    const objects: GardenWorldObjectRecord = { buildings: [], decorations: [], doors: [], roofGroups: [], interiorZones: [], residents: [] };

    this.repo.writeWorldMeta(meta);
    this.scheduler.scheduleWorldGrid(flatWorldId, grid, 'soon');
    this.scheduler.scheduleWorldObjects(flatWorldId, objects, 'soon');

    this.index = [{
      id: flatWorldId,
      templateId: 'flat-world',
      name: '超平坦世界',
      unlocked: true,
      created: Date.now(),
      lastVisited: 0,
      sortWeight: 0,
    }];
    this.scheduler.scheduleWorldIndex(this.index, 'soon');
  }

  private generateFlatGrid(width: number, height: number): GardenWorldGridData {
    const cells = Array.from({ length: height }, () => Array.from({ length: width }, () => ({ groundFrame: 'ground-grass-01', collision: false })));
    return { width, height, cells };
  }

  private generateGrid(template: GardenWorldTemplateDefinition): GardenWorldGridData {
    const grid = this.generateFlatGrid(template.defaultWidth, template.defaultHeight);

    // Process procedural terrain generation based on features
    if (template.terrainFeatureTags.includes('river')) {
      const riverY = Math.floor(template.defaultHeight / 2);
      for (let x = 0; x < template.defaultWidth; x++) {
        // Draw a simple 2-tile wide river horizontally across the map
        grid.cells[riverY][x] = { groundFrame: 'ground-water-01', collision: true };
        if (riverY + 1 < template.defaultHeight) {
          grid.cells[riverY + 1][x] = { groundFrame: 'ground-water-01', collision: true };
        }
      }
    }

    return grid;
  }
}
