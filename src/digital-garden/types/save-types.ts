/**
 * Save data types — maps directly to tiddler fields and text JSON.
 * Tiddler: $:/plugins/linonetwo/digital-garden/save/global
 */

/** Fields stored as tiddler field scalars (accessible via TW filter) */
export interface GardenGlobalSaveTiddlerFields {
  title: string;
  /** Copper coins — from SmallReward, used for daily ops and placement */
  'copper-coins': string;
  /** Gold coins — from LargeReward, used for blueprint unlock or silver exchange */
  'gold-coins': string;
  /** Silver coins — exchanged from gold, used for world unlock or copper exchange */
  'silver-coins': string;
  'lord-level': string;
  'lord-exp': string;
  /** ID of the currently loaded world */
  'current-world-id': string;
  /** Schema version for migration */
  version: string;
  /** Unix timestamp (ms) of last save */
  'last-saved': string;
  /** JSON-encoded GardenGlobalSaveJson */
  text: string;
}

/** Structured data stored in the tiddler text as JSON */
export interface GardenGlobalSaveJson {
  unlockedBlueprints: string[];
  unlockedWorlds: string[];
  playerState: GardenPlayerState;
  economyLedger: GardenEconomyLedgerSummary;
}

/** In-memory typed model (parsed from tiddler) */
export interface GardenGlobalSave {
  copperCoins: number;
  goldCoins: number;
  silverCoins: number;
  lordLevel: number;
  lordExp: number;
  currentWorldId: string;
  version: string;
  lastSaved: number;
  unlockedBlueprints: string[];
  unlockedWorlds: string[];
  playerState: GardenPlayerState;
  economyLedger: GardenEconomyLedgerSummary;
}

/** Player (lord) state persisted across sessions */
export interface GardenPlayerState {
  currentWorldId: string;
  tileX: number;
  tileY: number;
  direction: CardinalDirection;
}

/** Periodic economy summary — stored in global save JSON */
export interface GardenEconomyLedgerSummary {
  periodStart: number;
  periodEnd: number;
  copperEarned: number;
  copperSpent: number;
  goldEarned: number;
  goldSpent: number;
  silverEarned: number;
  silverSpent: number;
  blueprintsUnlocked: string[];
  worldsUnlocked: string[];
  smallRewardsConsumed: number;
  largeRewardsConsumed: number;
}

/** Index item for the world directory tiddler */
export interface GardenWorldIndexItem {
  id: string;
  templateId: string;
  name: string;
  unlocked: boolean;
  created: number;
  lastVisited: number;
  sortWeight: number;
}

export type CardinalDirection = 'north' | 'south' | 'east' | 'west';

export const GARDEN_SAVE_GLOBAL_TITLE = '$:/plugins/linonetwo/digital-garden/save/global';
export const GARDEN_SAVE_WORLD_INDEX_TITLE = '$:/plugins/linonetwo/digital-garden/save/world-index';
export const GARDEN_SAVE_VERSION = '0.1.0';

/** Returns the tiddler title for a given world + suffix */
export function gardenWorldTiddlerTitle(worldId: string, suffix: 'meta' | 'grid' | 'objects' | 'state'): string {
  return `$:/plugins/linonetwo/digital-garden/save/worlds/${worldId}/${suffix}`;
}
