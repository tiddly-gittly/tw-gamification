/**
 * RoofVisibilitySystem — controls which roof groups are visible.
 *
 * ⚠️ HIGH RISK — this is the most complex visual system in Phase 4.
 *
 * Logic:
 * 1. When the player enters a door tile, check the door's connectsInteriorZoneId.
 * 2. Set activeInteriorZoneId in WorldStateSystem.
 * 3. All roof groups whose hideWhenInteriorZoneId matches become invisible.
 * 4. When the player exits through a door, clear activeInteriorZoneId.
 *
 * Fallback plan (Phase 4):
 * - If same-map cutting is too complex, switch to loading a separate
 *   interior scene instead. WorldStateSystem data structure is unchanged.
 *
 * PLAN Phase 4 — domain layer
 */

import type { MapGridSystem } from './map-grid-system';
import type { WorldStateSystem } from './world-state-system';

export class RoofVisibilitySystem {
  /** Set of roof group ids that are currently hidden */
  private hiddenRoofGroups = new Set<string>();
  private listeners: Array<(hiddenGroups: ReadonlySet<string>) => void> = [];

  constructor(
    private readonly worldState: WorldStateSystem,
    private readonly mapGrid: MapGridSystem,
  ) {}

  /** Call every frame or on player movement to update roof visibility */
  update(playerTileX: number, playerTileY: number): void {
    if (!this.worldState.isLoaded) return;

    const strategy = this.worldState.meta.roofVisibilityStrategy;

    if (strategy === 'always-show') {
      this.setHidden(new Set());
      return;
    }
    if (strategy === 'always-hide') {
      const allIds = new Set(this.worldState.objects.roofGroups.map(rg => rg.id));
      this.setHidden(allIds);
      return;
    }

    // strategy === 'auto'
    const zoneId = this.mapGrid.getTileZoneId(playerTileX, playerTileY);
    if (zoneId !== this.worldState.state.activeInteriorZoneId) {
      this.worldState.setActiveInteriorZone(zoneId);
    }

    const newHidden = new Set<string>();
    for (const roofGroup of this.worldState.objects.roofGroups) {
      if (zoneId && roofGroup.hideWhenInteriorZoneId === zoneId) {
        newHidden.add(roofGroup.id);
      }
    }
    this.setHidden(newHidden);
  }

  isHidden(roofGroupId: string): boolean {
    return this.hiddenRoofGroups.has(roofGroupId);
  }

  get hiddenGroups(): ReadonlySet<string> {
    return this.hiddenRoofGroups;
  }

  onVisibilityChange(listener: (hiddenGroups: ReadonlySet<string>) => void): void {
    this.listeners.push(listener);
  }

  offVisibilityChange(listener: (hiddenGroups: ReadonlySet<string>) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private setHidden(newHidden: Set<string>): void {
    // Only notify if changed
    const changed = newHidden.size !== this.hiddenRoofGroups.size ||
      [...newHidden].some(id => !this.hiddenRoofGroups.has(id));

    if (changed) {
      this.hiddenRoofGroups = newHidden;
      for (const listener of this.listeners) listener(this.hiddenRoofGroups);
    }
  }
}
