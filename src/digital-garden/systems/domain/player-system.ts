/**
 * PlayerSystem — controls the lord character.
 *
 * Responsibilities:
 * - Accept click-to-move requests and compute paths via PathfindingSystem
 * - Advance the lord along the current path each game tick
 * - Update WorldStateSystem when position changes
 * - Detect when the lord enters a door tile (triggers RoofVisibilitySystem)
 * - Expose the lord's current tile, direction, and in-transit state
 *
 * PLAN Phase 4 — domain layer
 */

import type { IsoCoord } from '../../types/map-types';
import type { CardinalDirection } from '../../types/save-types';
import type { PathfindingSystem } from './pathfinding-system';
import type { RoofVisibilitySystem } from './roof-visibility-system';
import type { WorldStateSystem } from './world-state-system';

const MOVE_TICKS_PER_TILE = 8; // how many game ticks to cross one tile

export class PlayerSystem {
  private path: IsoCoord[] = [];
  private ticksOnCurrentTile = 0;
  /** Fractional position for smooth rendering (0–1 between tiles) */
  private lerp = 0;

  constructor(
    private readonly worldState: WorldStateSystem,
    private readonly pathfinding: PathfindingSystem,
    private readonly roofVisibility: RoofVisibilitySystem,
  ) {}

  get tileX(): number {
    return this.worldState.state.playerTileX;
  }
  get tileY(): number {
    return this.worldState.state.playerTileY;
  }
  get direction(): CardinalDirection {
    return this.worldState.state.playerDirection;
  }
  get isMoving(): boolean {
    return this.path.length > 0;
  }
  /** Smooth lerp fraction (0–1) toward the next tile */
  get lerpFraction(): number {
    return this.lerp;
  }

  /** Request the lord to move to (goalX, goalY) via pathfinding */
  moveTo(goalX: number, goalY: number): void {
    const found = this.pathfinding.findPath(this.tileX, this.tileY, goalX, goalY);
    this.path = found ?? [];
    this.ticksOnCurrentTile = 0;
    this.lerp = 0;
  }

  /** Call once per game tick (not per frame) */
  tick(): void {
    if (this.path.length === 0) return;

    this.ticksOnCurrentTile++;
    this.lerp = this.ticksOnCurrentTile / MOVE_TICKS_PER_TILE;

    if (this.ticksOnCurrentTile >= MOVE_TICKS_PER_TILE) {
      const next = this.path.shift()!;
      const previousX = this.tileX;
      const previousY = this.tileY;
      const direction = this.getDirection(previousX, previousY, next.tileX, next.tileY);

      this.worldState.updatePlayerPosition(next.tileX, next.tileY, direction);
      this.ticksOnCurrentTile = 0;
      this.lerp = 0;

      // Notify roof visibility system of new position
      this.roofVisibility.update(next.tileX, next.tileY);
    }
  }

  private getDirection(fromX: number, fromY: number, toX: number, toY: number): CardinalDirection {
    const dx = toX - fromX;
    const dy = toY - fromY;
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'east' : 'west';
    return dy > 0 ? 'south' : 'north';
  }
}
