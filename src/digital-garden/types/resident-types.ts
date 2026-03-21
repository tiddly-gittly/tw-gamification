/**
 * Resident archetype and instance types.
 *
 * Archetype: static definition (shadow tiddler)
 * ResidentState: runtime low-frequency state persisted in /objects JSON
 */

/**
 * Resident archetype shadow tiddler fields.
 * Title: $:/plugins/linonetwo/digital-garden/resident-archetypes/{id}
 * Tags:  $:/tags/DigitalGarden/ResidentArchetype
 */
export interface GardenResidentArchetypeTiddlerFields {
  title: string;
  tags: string;
  caption: string;
  description: string;
  icon: string;
  /** Atlas frame key for the standing/idle sprite */
  'atlas-frame': string;
  /** Atlas frame key prefix for walk animation frames */
  'walk-atlas-prefix': string;
  /** Walk speed in tiles per second */
  'move-speed': string;
  /** Max roam radius in tiles from home building */
  'max-roam-radius': string;
  /** JSON: GardenResidentNeedSlot[] */
  'need-slots': string;
  /** JSON: Record<string, number> — behavior name to weight */
  'behavior-weights': string;
  enabled: string;
}

/** A need slot defining one dimension of a resident's state */
export interface GardenResidentNeedSlot {
  id: string;
  label: string;
  /** Maximum need value */
  maxValue: number;
  /** Decay rate per minute (need decreases over time) */
  decayRate: number;
  /** Need value below which the resident actively seeks fulfillment */
  thresholdLow: number;
  /** Service tags of buildings that can fulfill this need */
  preferredServiceTags: string[];
  /** Optional reward produced when the need is fully satisfied */
  fulfillReward?: { type: string; amount: number };
}

/** In-memory resident archetype definition */
export interface GardenResidentArchetype {
  id: string;
  caption: string;
  description: string;
  icon: string;
  atlasFrame: string;
  walkAtlasPrefix: string;
  moveSpeed: number;
  maxRoamRadius: number;
  needSlots: GardenResidentNeedSlot[];
  behaviorWeights: Record<string, number>;
  enabled: boolean;
}

/**
 * Runtime resident state — persisted at low frequency in /objects JSON.
 * High-frequency state (path, animation frame) lives in memory only.
 */
export interface GardenResidentState {
  id: string;
  archetypeId: string;
  worldId: string;
  tileX: number;
  tileY: number;
  direction: 'north' | 'south' | 'east' | 'west';
  /** Current high-level behavior label */
  currentBehavior: 'idle' | 'roaming' | 'seeking' | 'using-building' | 'going-home';
  /** Target tile when roaming or seeking */
  targetTileX?: number;
  targetTileY?: number;
  /** Building currently being used */
  currentBuildingId?: string;
  /** Home building (spawned from) */
  homeBuildingId?: string;
  /** Current need values by slot id */
  needValues: Record<string, number>;
  /** Behavior cooldown timers by behavior name (Unix ms) */
  cooldowns: Record<string, number>;
  /** Unix ms of last state snapshot write */
  lastUpdated: number;
}

/** Container for all object instances in a world (stored in /objects) */
export interface GardenWorldObjectRecord {
  buildings: import('./building-types').GardenBuildingInstance[];
  decorations: import('./building-types').GardenDecorationInstance[];
  doors: import('./building-types').GardenDoorInstance[];
  roofGroups: import('./map-types').GardenRoofGroupRecord[];
  interiorZones: import('./map-types').GardenInteriorZoneRecord[];
  residents: GardenResidentState[];
}
