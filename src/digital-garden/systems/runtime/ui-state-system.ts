/**
 * UiStateSystem — manages transient UI state that lives only in memory.
 *
 * This includes:
 * - Active tool (move, place, select, delete)
 * - Placement preview state (active blueprint, ghost position)
 * - Selected building id
 * - Details panel open/close
 * - Tooltip content
 * - Blueprint picker visibility
 *
 * None of this is persisted to tiddlers.
 *
 * PLAN Phase 5 — runtime layer
 */

import type { GardenBlueprintDefinition } from '../../types/building-types';

export type ActiveTool = 'move' | 'place' | 'select' | 'delete';

export interface PlacementGhostState {
  blueprint: GardenBlueprintDefinition;
  tileX: number;
  tileY: number;
  rotation: 0 | 90 | 180 | 270;
  valid: boolean;
}

export class UiStateSystem {
  activeTool: ActiveTool = 'move';
  selectedBuildingId: string | undefined;
  placementGhost: PlacementGhostState | undefined;
  detailsPanelOpen = false;
  blueprintPickerOpen = false;
  tooltipText = '';

  private listeners = new Set<() => void>();

  onUiChange(listener: () => void): void {
    this.listeners.add(listener);
  }

  offUiChange(listener: () => void): void {
    this.listeners.delete(listener);
  }

  setTool(tool: ActiveTool): void {
    this.activeTool = tool;
    if (tool !== 'place') this.placementGhost = undefined;
    this.notify();
  }

  startPlacement(blueprint: GardenBlueprintDefinition): void {
    this.activeTool = 'place';
    this.placementGhost = { blueprint, tileX: 0, tileY: 0, rotation: 0, valid: false };
    this.notify();
  }

  updateGhostPosition(tileX: number, tileY: number, valid: boolean): void {
    if (this.placementGhost) {
      this.placementGhost.tileX = tileX;
      this.placementGhost.tileY = tileY;
      this.placementGhost.valid = valid;
      this.notify();
    }
  }

  rotateGhost(): void {
    if (this.placementGhost) {
      const rotations: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];
      const index = (rotations.indexOf(this.placementGhost.rotation) + 1) % 4;
      this.placementGhost.rotation = rotations[index];
      this.notify();
    }
  }

  cancelPlacement(): void {
    this.placementGhost = undefined;
    this.activeTool = 'move';
    this.notify();
  }

  selectBuilding(id: string | undefined): void {
    this.selectedBuildingId = id;
    this.detailsPanelOpen = id !== undefined;
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
