/**
 * World-level data types.
 * Each world is split into 4 tiddlers: meta / grid / objects / state
 */

import type { CardinalDirection } from './save-types';

/** Tiddler fields for the world meta tiddler */
export interface GardenWorldMetaTiddlerFields {
  title: string;
  name: string;
  'template-id': string;
  /** Width in tiles */
  width: string;
  /** Height in tiles */
  height: string;
  'weather-theme': string;
  'ambient-audio-key': string;
  /**
   * Strategy for showing/hiding roofs.
   * 'auto': hide roof when player is inside interior-zone.
   * 'always-show': always show roof (decorative override).
   * 'always-hide': always hide roof (editing mode).
   */
  'roof-visibility-strategy': 'auto' | 'always-show' | 'always-hide';
}

/** In-memory typed model for world metadata */
export interface GardenWorldMeta {
  id: string;
  name: string;
  templateId: string;
  width: number;
  height: number;
  weatherTheme: string;
  ambientAudioKey: string;
  roofVisibilityStrategy: 'auto' | 'always-show' | 'always-hide';
}

/** Transient world state stored in the /state tiddler */
export interface GardenWorldState {
  worldId: string;
  camera: { x: number; y: number; zoom: number };
  playerTileX: number;
  playerTileY: number;
  playerDirection: CardinalDirection;
  selectedBuildingId: string | undefined;
  activeInteriorZoneId: string | undefined;
  /** Map of building instance id → operation mode */
  buildingOperationStates: Record<string, 'running' | 'paused'>;
}

/** Index item stored in the world index tiddler */
export interface GardenWorldRegistryEntry {
  id: string;
  templateId: string;
  name: string;
  unlocked: boolean;
  created: number;
  lastVisited: number;
  sortWeight: number;
}
