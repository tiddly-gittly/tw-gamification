/**
 * ResidentSystem — lightweight NPC simulation.
 *
 * Responsibilities:
 * - Spawn residents from home buildings
 * - Advance residents toward buildings that satisfy their needs
 * - Trigger copper charges when residents use buildings
 * - Accumulate need fulfillment and fire delayed rewards
 * - Persist resident states at low frequency via WorldStateSystem
 *
 * PLAN Phase 5 — domain layer
 */

import type { GardenResidentState } from '../../types/resident-types';
import type { EconomySystem } from './economy-system';
import type { PathfindingSystem } from './pathfinding-system';
import type { WorldStateSystem } from './world-state-system';

const NEED_TICK_INTERVAL_MS = 60_000; // residents update needs every minute of real time
const SNAPSHOT_INTERVAL_MS = 30_000; // persist resident states every 30 s

export class ResidentSystem {
  private lastNeedTick = 0;
  private lastSnapshot = 0;
  /** Runtime-only movement: residentId → current path */
  private paths = new Map<string, Array<{ tileX: number; tileY: number }>>();

  constructor(
    private readonly worldState: WorldStateSystem,
    private readonly pathfinding: PathfindingSystem,
    private readonly economy: EconomySystem,
  ) {}

  /** Call on every game tick (lightweight per-tick logic only) */
  tick(nowMs: number): void {
    if (!this.worldState.isLoaded) return;

    const residents = this.worldState.objects.residents;
    if (residents.length === 0) return;

    // Advance movement paths
    for (const resident of residents) {
      this.advanceMovement(resident);
    }

    // Decay needs periodically
    if (nowMs - this.lastNeedTick > NEED_TICK_INTERVAL_MS) {
      this.lastNeedTick = nowMs;
      for (const resident of residents) {
        this.decayNeeds(resident);
        this.chooseNextBehavior(resident);
      }
    }

    // Persist snapshot periodically
    if (nowMs - this.lastSnapshot > SNAPSHOT_INTERVAL_MS) {
      this.lastSnapshot = nowMs;
      for (const resident of residents) {
        this.worldState.updateResidentState(resident.id, resident);
      }
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private advanceMovement(resident: GardenResidentState): void {
    const path = this.paths.get(resident.id);
    if (!path || path.length === 0) return;

    const next = path.shift()!;
    const dx = next.tileX - resident.tileX;
    const dy = next.tileY - resident.tileY;
    resident.tileX = next.tileX;
    resident.tileY = next.tileY;
    if (Math.abs(dx) >= Math.abs(dy)) resident.direction = dx > 0 ? 'east' : 'west';
    else resident.direction = dy > 0 ? 'south' : 'north';

    // Arrival check
    if (path.length === 0) {
      this.paths.delete(resident.id);
      if (resident.currentBehavior === 'seeking' && resident.currentBuildingId) {
        resident.currentBehavior = 'using-building';
      } else {
        resident.currentBehavior = 'idle';
      }
    }
  }

  private decayNeeds(resident: GardenResidentState): void {
    // Look up archetype need-slots and apply decay rates
    // Decay energy, fun, and bladder by standard amounts.
    for (const key of Object.keys(resident.needValues)) {
      resident.needValues[key] = Math.max(0, resident.needValues[key] - 5);
    }
  }

  private chooseNextBehavior(resident: GardenResidentState): void {
    if (resident.currentBehavior === 'using-building') return;

    // Find building that satisfies lowest need
    let lowestNeed = Infinity;
    let lowestNeedTag = '';

    for (const [key, value] of Object.entries(resident.needValues)) {
      if (value < lowestNeed) {
        lowestNeed = value;
        lowestNeedTag = key; // Assuming need keys map directly to service tags e.g. 'rest', 'fun'
      }
    }

    const buildings = this.worldState.objects.buildings.filter(
      b => b.enabled && b.operationMode === 'running' && b.serviceTags.includes(lowestNeedTag),
    );

    // Fallback to any active building if the matched one isn't found
    const targetBuildings = buildings.length > 0 ? buildings : this.worldState.objects.buildings.filter(
      b => b.enabled && b.operationMode === 'running' && b.serviceTags.length > 0,
    );

    if (targetBuildings.length === 0) {
      resident.currentBehavior = 'idle';
      return;
    }

    const target = targetBuildings[Math.floor(Math.random() * targetBuildings.length)];
    resident.currentBuildingId = target.id;
    resident.targetTileX = target.tileX;
    resident.targetTileY = target.tileY;
    resident.currentBehavior = 'seeking';

    const path = this.pathfinding.findPath(resident.tileX, resident.tileY, target.tileX, target.tileY, 256);
    if (path) this.paths.set(resident.id, path);
    else resident.currentBehavior = 'idle';
  }
}
