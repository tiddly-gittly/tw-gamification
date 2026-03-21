/**
 * MapGridSystem — tile queries, collision/passability, and zone membership.
 *
 * Provides:
 * - isPassable(tileX, tileY): considers grid collision + building footprints
 * - getTileZoneId(tileX, tileY)
 * - getTileRoofGroupId(tileX, tileY)
 * - markFootprint(buildingId, tiles, passable): updates runtime collision map
 * - Coordinate conversion helpers (delegates to map-types)
 *
 * PLAN Phase 3 — domain layer
 */

import { screenToTile, tileToScreen } from '../../types/map-types';
import type { IsoCoord, ScreenCoord } from '../../types/map-types';
import type { WorldStateSystem } from './world-state-system';

export class MapGridSystem {
  /** Runtime collision overlay: keys are "x,y", true = blocked */
  private readonly runtimeCollision = new Map<string, boolean>();

  constructor(private readonly worldState: WorldStateSystem) {}

  /** Call when a world is loaded to build the runtime collision overlay from placed objects. */
  rebuildCollisionOverlay(): void {
    this.runtimeCollision.clear();
    if (!this.worldState.isLoaded) return;

    for (const building of this.worldState.objects.buildings) {
      for (const offset of this.getBlueprintFootprint(building.blueprintId, building.rotation)) {
        const key = `${building.tileX + offset.x},${building.tileY + offset.y}`;
        this.runtimeCollision.set(key, true);
      }
    }

    // Add door tiles as passable overrides
    for (const door of this.worldState.objects.doors) {
      if (door.passable) {
        const key = `${door.tileX},${door.tileY}`;
        this.runtimeCollision.set(key, false);
      }
    }
  }

  isPassable(tileX: number, tileY: number): boolean {
    const { grid } = this.worldState;
    if (tileX < 0 || tileY < 0 || tileX >= grid.width || tileY >= grid.height) return false;
    if (grid.cells[tileY]?.[tileX]?.collision) return false;
    return !this.runtimeCollision.get(`${tileX},${tileY}`);
  }

  isInBounds(tileX: number, tileY: number): boolean {
    const { width, height } = this.worldState.grid;
    return tileX >= 0 && tileY >= 0 && tileX < width && tileY < height;
  }

  getTileZoneId(tileX: number, tileY: number): string | undefined {
    return this.worldState.grid.cells[tileY]?.[tileX]?.zoneId;
  }

  getTileRoofGroupId(tileX: number, tileY: number): string | undefined {
    return this.worldState.grid.cells[tileY]?.[tileX]?.roofGroupId;
  }

  getGroundFrame(tileX: number, tileY: number): string {
    return this.worldState.grid.cells[tileY]?.[tileX]?.groundFrame ?? 'ground-grass-01';
  }

  // ─── Footprint helpers ────────────────────────────────────────────────────

  markFootprint(tileX: number, tileY: number, footprint: Array<{ x: number; y: number }>, blocked: boolean): void {
    for (const offset of footprint) {
      const key = `${tileX + offset.x},${tileY + offset.y}`;
      if (blocked) this.runtimeCollision.set(key, true);
      else this.runtimeCollision.delete(key);
    }
  }

  isFootprintFree(tileX: number, tileY: number, footprint: Array<{ x: number; y: number }>): boolean {
    for (const offset of footprint) {
      if (!this.isPassable(tileX + offset.x, tileY + offset.y)) return false;
    }
    return true;
  }

  // ─── Query objects at tile ────────────────────────────────────────────────

  getBuildingAt(tileX: number, tileY: number): import('../../types/building-types').GardenBuildingInstance | undefined {
    return this.worldState.objects.buildings.find(b => {
      const footprint = this.getBlueprintFootprint(b.blueprintId, b.rotation);
      return footprint.some(o => b.tileX + o.x === tileX && b.tileY + o.y === tileY);
    });
  }

  // ─── Coordinate helpers ───────────────────────────────────────────────────

  tileToScreen(tileX: number, tileY: number): ScreenCoord {
    const tileSize = this.getTileSize();
    return tileToScreen(tileX, tileY, tileSize);
  }

  screenToTile(screenX: number, screenY: number): IsoCoord {
    const tileSize = this.getTileSize();
    return screenToTile(screenX, screenY, tileSize);
  }

  private getTileSize(): number {
    // TODO: read from config tiddler at runtime
    return 64;
  }

  /** Lookup a blueprint's footprint from shadow tiddlers. Cached lazily. */
  private readonly footprintCache = new Map<string, Array<{ x: number; y: number }>>();
  getBlueprintFootprint(blueprintId: string, rotation: number = 0): Array<{ x: number; y: number }> {
    let baseFootprint: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];
    const cached = this.footprintCache.get(blueprintId);
    if (cached) {
      baseFootprint = cached;
    } else {
      try {
        const title = `$:/plugins/linonetwo/digital-garden/blueprints/${blueprintId}`;
        const tiddler = (globalThis as any).$tw?.wiki?.getTiddler(title);
        if (tiddler?.fields?.footprint) {
          const parsed = JSON.parse(String(tiddler.fields.footprint)) as Array<{ x: number; y: number }>;
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.footprintCache.set(blueprintId, parsed);
            baseFootprint = parsed;
          }
        }
      } catch { /* ignore parse errors */ }
    }

    if (rotation === 0) return baseFootprint;

    return baseFootprint.map(f => {
      if (rotation === 90) return { x: -f.y, y: f.x };
      if (rotation === 180) return { x: -f.x, y: -f.y };
      if (rotation === 270) return { x: f.y, y: -f.x };
      return f;
    });
  }
}
