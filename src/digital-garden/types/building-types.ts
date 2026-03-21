/**
 * Building and blueprint types.
 *
 * Blueprint: static definition (shadow tiddler, content-addressed by id)
 * BuildingInstance: runtime placement in a specific world
 */

/** Building category */
export type BuildingCategory = 'learning' | 'rest' | 'display' | 'social' | 'decoration' | 'terrain';

/**
 * Blueprint definition — stored as shadow tiddler fields.
 * Title: $:/plugins/linonetwo/digital-garden/blueprints/{id}
 * Tags:  $:/tags/DigitalGarden/Blueprint
 */
export interface GardenBlueprintTiddlerFields {
  title: string;
  tags: string;
  caption: string;
  description: string;
  icon: string;
  category: BuildingCategory;
  /** Width in tiles */
  'building-width': string;
  /** Height in tiles */
  'building-height': string;
  /** JSON: Array<{x,y}> relative tile offsets from anchor */
  footprint: string;
  /** Atlas sprite frame key for the main building sprite */
  'atlas-frame': string;
  /** Copper cost to place */
  'copper-cost': string;
  /** Gold cost to unlock blueprint */
  'gold-cost': string;
  /** Minimum lord level required to unlock */
  'unlock-required-level': string;
  /** Space-separated service tags (e.g. "learning rest") */
  'service-tags': string;
  /** Whether building has an interior zone */
  'has-interior': string;
  /** JSON: GardenRoofGroupTemplate | null */
  'roof-group-template': string;
  /** JSON: Array<{dx,dy,direction}> door offsets from anchor */
  'door-node-offsets': string;
  /** Copper cost per game tick to keep running */
  'maintenance-cost': string;
  /** Whether this building can hold knowledge tiddler content */
  'content-capable': string;
  /** Space-separated content modes: bookshelf noticeboard monument none */
  'content-modes': string;
  enabled: string;
}

/** In-memory blueprint definition */
export interface GardenBlueprintDefinition {
  id: string;
  caption: string;
  description: string;
  icon: string;
  category: BuildingCategory;
  buildingWidth: number;
  buildingHeight: number;
  footprint: Array<{ x: number; y: number }>;
  atlasFrame: string;
  copperCost: number;
  goldCost: number;
  unlockRequiredLevel: number;
  serviceTags: string[];
  hasInterior: boolean;
  roofGroupTemplate: GardenRoofGroupTemplate | null;
  doorNodeOffsets: Array<{ dx: number; dy: number; direction: string }>;
  maintenanceCost: number;
  contentCapable: boolean;
  contentModes: string[];
  enabled: boolean;
}

/** Template for roof group generation when placing a building */
export interface GardenRoofGroupTemplate {
  /** Tile offsets for roof blocks relative to building anchor */
  roofTiles: Array<{ dx: number; dy: number; atlasFrame: string }>;
  /** Tile offsets for wall occlusion relative to building anchor */
  wallOccludeTileOffsets: Array<{ dx: number; dy: number }>;
}

/** A placed building instance in a world (stored in /objects JSON) */
export interface GardenBuildingInstance {
  id: string;
  blueprintId: string;
  worldId: string;
  tileX: number;
  tileY: number;
  /** Rotation in 90-degree steps */
  rotation: 0 | 90 | 180 | 270;
  /** Extra depth offset for layering (usually 0) */
  zOffset: number;
  state: 'normal' | 'constructing' | 'broken' | 'inactive';
  /** Whether the building is enabled (placed and active) */
  enabled: boolean;
  /** Roof group id assigned when placed */
  roofGroupId?: string;
  /** Interaction group id (links multiple interactive hotspots) */
  interactionGroupId?: string;
  /** Number of residents currently using this building */
  occupancy: number;
  /** Copper per game tick while running */
  maintenanceCost: number;
  /** Link to a knowledge tiddler (for content-capable buildings) */
  linkTarget?: string;
  /** Functional building extra fields (present when blueprint.hasInterior or serviceTags.length > 0) */
  operationMode: 'running' | 'paused';
  serviceTags: string[];
  interiorZoneId?: string;
  doorNodeIds: string[];
  contentMode: 'bookshelf' | 'noticeboard' | 'monument' | 'none';
  contentSourceTiddler?: string;
  contentPreviewTemplate?: string;
  contentSummaryField?: string;
  contentOpenAction?: string;
  contentIconSource?: string;
}

/** Decoration instance (simpler than building — no interior, no service tags) */
export interface GardenDecorationInstance {
  id: string;
  blueprintId: string;
  worldId: string;
  tileX: number;
  tileY: number;
  rotation: 0 | 90 | 180 | 270;
  zOffset: number;
  enabled: boolean;
}

/** Door instance connecting exterior and interior zones */
export interface GardenDoorInstance {
  id: string;
  buildingId: string;
  tileX: number;
  tileY: number;
  direction: 'north' | 'south' | 'east' | 'west';
  /** The exterior zone (undefined = open world) */
  connectsExteriorZoneId?: string;
  /** The interior zone this door leads into */
  connectsInteriorZoneId: string;
  passable: boolean;
}
