/**
 * Map grid types — 45-degree isometric single-layer grid with 5 logical layers.
 *
 * Logical layers (all stored in a single GardenWorldGridData JSON):
 *   ground-layer      — ground tile atlas frames
 *   collision-layer   — passability for each tile
 *   object-footprint  — which building/object occupies each tile (runtime only)
 *   roof-layer        — roof tile data (controlled by RoofVisibilitySystem)
 *   zone-layer        — interior zone membership per tile
 *
 * Coordinate system:
 *   Logical (tileX, tileY) → isometric screen (screenX, screenY)
 *   screenX = (tileX - tileY) * (tileWidth / 2)
 *   screenY = (tileX + tileY) * (tileHeight / 2)   where tileHeight = tileWidth / 2
 */

/** A single logical grid cell */
export interface GardenGridCell {
  /** Atlas frame key for the ground tile */
  groundFrame: string;
  /** Whether this tile blocks movement */
  collision: boolean;
  /** If this tile is part of a roof group, the group id */
  roofGroupId?: string;
  /** Atlas frame key for the roof tile (rendered only when roof is visible) */
  roofFrame?: string;
  /** Interior zone id if this tile is inside a zone */
  zoneId?: string;
}

/** Full grid data stored in the /grid tiddler JSON */
export interface GardenWorldGridData {
  width: number;
  height: number;
  /** Row-major: cells[y][x] */
  cells: GardenGridCell[][];
}

/** Roof group — links roof tiles to a building and controls their visibility */
export interface GardenRoofGroupRecord {
  id: string;
  /** Building instance id this roof belongs to */
  buildingId: string;
  /**
   * When the player enters this interior zone id, the roof group becomes hidden.
   * Required if building has interior.
   */
  hideWhenInteriorZoneId: string;
  /** Wall tiles that become occluded when roof is hidden */
  wallOccludeTiles: Array<{ x: number; y: number }>;
}

/** Interior zone — a closed region inside a building */
export interface GardenInteriorZoneRecord {
  id: string;
  name: string;
  /** All tile coordinates belonging to this zone */
  tiles: Array<{ x: number; y: number }>;
  /** Door instance ids that connect the exterior to this zone */
  entryDoorIds: string[];
  /** Override which display layers are visible while inside */
  visibleLayersOverride: string[];
}

/** Isometric coordinate helper */
export interface IsoCoord {
  tileX: number;
  tileY: number;
}

/** Screen coordinate */
export interface ScreenCoord {
  x: number;
  y: number;
}

/** Convert logical tile coordinate to isometric screen coordinate */
export function tileToScreen(tileX: number, tileY: number, tileWidth: number): ScreenCoord {
  const halfW = tileWidth / 2;
  const halfH = tileWidth / 4; // 2:1 diamond ratio
  return {
    x: (tileX - tileY) * halfW,
    y: (tileX + tileY) * halfH,
  };
}

/** Convert isometric screen coordinate back to logical tile (nearest) */
export function screenToTile(screenX: number, screenY: number, tileWidth: number): IsoCoord {
  const halfW = tileWidth / 2;
  const halfH = tileWidth / 4;
  const tileX = Math.round(screenX / (2 * halfW) + screenY / (2 * halfH));
  const tileY = Math.round(-screenX / (2 * halfW) + screenY / (2 * halfH));
  return { tileX, tileY };
}
