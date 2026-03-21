/**
 * BuildingOperationSystem — manages building running/paused state and the
 * resident investment cycle.
 *
 * Investment loop:
 *   1. Building is 'running' → charges maintenance copper each tick.
 *   2. Resident visits a running building to satisfy a need.
 *   3. When a need threshold is reached, a delayed output reward fires.
 *      (e.g. resident reads bookshelf → knowledge gain → small copper bonus)
 *
 * PLAN Phase 5 — domain layer
 */

import type { SaveScheduler } from '../infra/save-scheduler';
import type { EconomySystem } from './economy-system';
import type { WorldStateSystem } from './world-state-system';

const MAINTENANCE_TICK_INTERVAL_MS = 300_000; // charge maintenance every 5 minutes

export class BuildingOperationSystem {
  private lastMaintenanceTick = 0;

  constructor(
    private readonly worldState: WorldStateSystem,
    private readonly economy: EconomySystem,
    private readonly scheduler: SaveScheduler,
  ) {}

  /** Call on every game tick */
  tick(nowMs: number): void {
    if (!this.worldState.isLoaded) return;
    if (nowMs - this.lastMaintenanceTick < MAINTENANCE_TICK_INTERVAL_MS) return;

    this.lastMaintenanceTick = nowMs;
    this.chargeMaintenance();
  }

  /** Toggle a building between running and paused */
  toggleOperation(buildingId: string): void {
    const mode = this.worldState.state.buildingOperationStates[buildingId] ?? 'running';
    const next: 'running' | 'paused' = mode === 'running' ? 'paused' : 'running';
    this.worldState.setBuildingOperationMode(buildingId, next);
  }

  isRunning(buildingId: string): boolean {
    return (this.worldState.state.buildingOperationStates[buildingId] ?? 'running') === 'running';
  }

  /**
   * Fire a delayed output reward when a resident finishes using a building.
   * Called by ResidentSystem when a resident completes its 'using-building' behavior.
   */
  onResidentUsedBuilding(buildingId: string, needSlotId: string): void {
    const building = this.worldState.objects.buildings.find(b => b.id === buildingId);
    if (!building) return;

    // Reward calculation based on building service tags and maintenance.
    // Base reward is 2 copper, scaled by maintenance cost.
    const baseReward = 2;
    const bonusMultiplier = building.maintenanceCost > 0 ? 1.5 : 1.0;
    const reward = Math.round(baseReward * bonusMultiplier);

    this.economy.spendCopper(-reward); // negative spend = credit
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private chargeMaintenance(): void {
    let totalCost = 0;
    for (const building of this.worldState.objects.buildings) {
      if (!this.isRunning(building.id)) continue;
      totalCost += building.maintenanceCost;
    }

    if (totalCost > 0) {
      const result = this.economy.spendCopper(totalCost);
      if (!result.ok) {
        // Cannot afford maintenance — pause all buildings automatically
        for (const building of this.worldState.objects.buildings) {
          if (this.isRunning(building.id)) {
            this.worldState.setBuildingOperationMode(building.id, 'paused');
          }
        }
      }
    }
  }
}
