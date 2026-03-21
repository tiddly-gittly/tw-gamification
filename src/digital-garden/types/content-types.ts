/**
 * Knowledge content binding types.
 *
 * Content-capable buildings can be linked to a TiddlyWiki tiddler,
 * providing a lightweight details panel instead of rendering the full tiddler body.
 */

/** Content display mode for a building */
export type ContentMode = 'bookshelf' | 'noticeboard' | 'monument' | 'none';

/**
 * Content binding configuration — stored inside GardenBuildingInstance.
 * Also mirrors the tiddler fields in the blueprint definition.
 */
export interface GardenContentBinding {
  /** How this building displays its linked content */
  contentMode: ContentMode;
  /** Title of the TiddlyWiki tiddler to display */
  contentSourceTiddler?: string;
  /**
   * Optional tiddler title of a WikiText template for the details panel.
   * Defaults to the plugin's built-in template per contentMode.
   */
  contentPreviewTemplate?: string;
  /**
   * Which field to read for the summary text.
   * Defaults to 'description' then falls back to first 100 chars of 'text'.
   */
  contentSummaryField?: string;
  /**
   * TiddlyWiki action to invoke when the player opens the full tiddler.
   * Default: open in story river.
   */
  contentOpenAction?: string;
  /**
   * Where to get the display icon.
   * Can be a tiddler title or a field name prefixed with 'field:'.
   * E.g. 'field:icon' reads the icon field from contentSourceTiddler.
   */
  contentIconSource?: string;
}

/** The data shown in the lightweight details panel */
export interface GardenContentPreviewData {
  title: string;
  caption: string;
  summary: string;
  icon: string;
  contentMode: ContentMode;
  /** True if the full tiddler can be opened */
  canOpen: boolean;
}

/** World template definition (for world unlock system) */
export interface GardenWorldTemplateDefinition {
  id: string;
  caption: string;
  description: string;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
  /** Silver coins required to unlock */
  silverCost: number;
  /** Terrain feature tags (e.g. ['lake', 'river']) */
  terrainFeatureTags: string[];
  spawnRules: {
    /** Initial copper coins in the new world */
    initialCopper: number;
    /** Blueprint ids unlocked at start */
    starterBlueprintIds: string[];
  };
  ambientAudioKey: string;
}
