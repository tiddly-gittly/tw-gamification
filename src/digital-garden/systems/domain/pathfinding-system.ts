/**
 * PathfindingSystem — A* pathfinding on the isometric grid.
 *
 * Shared by PlayerSystem (lord) and ResidentSystem (NPCs).
 * Uses MapGridSystem.isPassable() as the passability source.
 *
 * Returns a tile path as Array<{x,y}> or null if no path exists.
 * Limits search to maxNodes to prevent frame spikes (configurable per caller).
 *
 * PLAN Phase 4 — domain layer
 */

import type { IsoCoord } from '../../types/map-types';
import type { MapGridSystem } from './map-grid-system';

interface AStarNode {
  x: number;
  y: number;
  g: number;
  f: number;
  parent: AStarNode | null;
}

export class PathfindingSystem {
  constructor(private readonly mapGrid: MapGridSystem) {}

  /**
   * Find a path from (startX, startY) to (goalX, goalY).
   * Returns the path (including goal, excluding start) or null if unreachable.
   */
  findPath(
    startX: number,
    startY: number,
    goalX: number,
    goalY: number,
    maxNodes = 512,
  ): IsoCoord[] | null {
    if (startX === goalX && startY === goalY) return [];
    if (!this.mapGrid.isPassable(goalX, goalY)) return null;

    const open: AStarNode[] = [];
    const closed = new Set<string>();

    const startNode: AStarNode = { x: startX, y: startY, g: 0, f: this.heuristic(startX, startY, goalX, goalY), parent: null };
    open.push(startNode);

    let nodesExplored = 0;

    while (open.length > 0 && nodesExplored < maxNodes) {
      open.sort((a, b) => a.f - b.f);
      const current = open.shift()!;
      nodesExplored++;

      const key = `${current.x},${current.y}`;
      if (closed.has(key)) continue;
      closed.add(key);

      if (current.x === goalX && current.y === goalY) {
        return this.reconstructPath(current);
      }

      for (const [nx, ny] of this.neighbors(current.x, current.y)) {
        const nKey = `${nx},${ny}`;
        if (closed.has(nKey) || !this.mapGrid.isPassable(nx, ny)) continue;

        const g = current.g + 1;
        const f = g + this.heuristic(nx, ny, goalX, goalY);
        open.push({ x: nx, y: ny, g, f, parent: current });
      }
    }

    return null; // no path or exceeded node limit
  }

  private heuristic(x: number, y: number, gx: number, gy: number): number {
    // Manhattan distance on isometric grid
    return Math.abs(x - gx) + Math.abs(y - gy);
  }

  private neighbors(x: number, y: number): Array<[number, number]> {
    return [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
      // Diagonal movement — optional for isometric feel
      [x + 1, y + 1],
      [x - 1, y - 1],
      [x + 1, y - 1],
      [x - 1, y + 1],
    ];
  }

  private reconstructPath(node: AStarNode): IsoCoord[] {
    const path: IsoCoord[] = [];
    let current: AStarNode | null = node;
    while (current !== null) {
      path.unshift({ tileX: current.x, tileY: current.y });
      current = current.parent;
    }
    path.shift(); // remove start
    return path;
  }
}
