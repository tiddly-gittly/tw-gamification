/**
 * TiddlerRepository — bidirectional mapping between TiddlyWiki tiddler fields/text
 * and typed in-memory domain models.
 *
 * Responsibilities:
 * - Read tiddler fields and text JSON → typed models
 * - Convert typed models → tiddler field/text updates
 * - Centralise all $tw.wiki access so domain systems never call $tw directly
 *
 * PLAN Phase 2 — infra layer
 */

import type { ITiddlerFields } from 'tiddlywiki';
import type { GardenWorldGridData } from '../../types/map-types';
import type { GardenWorldObjectRecord } from '../../types/resident-types';
import type { GardenGlobalSave, GardenGlobalSaveJson, GardenGlobalSaveTiddlerFields, GardenWorldIndexItem } from '../../types/save-types';
import { GARDEN_SAVE_GLOBAL_TITLE, GARDEN_SAVE_VERSION, GARDEN_SAVE_WORLD_INDEX_TITLE, gardenWorldTiddlerTitle } from '../../types/save-types';
import type { GardenWorldMeta, GardenWorldMetaTiddlerFields, GardenWorldState } from '../../types/world-types';

declare const $tw: { wiki: { getTiddler(title: string): { fields: ITiddlerFields } | null; addTiddler(fields: ITiddlerFields): void } };

export class TiddlerRepository {
  // ─── Global Save ──────────────────────────────────────────────────────────

  readGlobalSave(): GardenGlobalSave {
    const tiddler = $tw.wiki.getTiddler(GARDEN_SAVE_GLOBAL_TITLE);
    if (!tiddler) return this.defaultGlobalSave();

    const fields = tiddler.fields as unknown as GardenGlobalSaveTiddlerFields;
    let json: GardenGlobalSaveJson = { unlockedBlueprints: [], unlockedWorlds: [], playerState: this.defaultPlayerState(), economyLedger: this.defaultLedger() };

    try {
      if (fields.text) json = JSON.parse(fields.text) as GardenGlobalSaveJson;
    } catch { /* ignore */ }

    return {
      copperCoins: Number(fields['copper-coins']) || 0,
      goldCoins: Number(fields['gold-coins']) || 0,
      silverCoins: Number(fields['silver-coins']) || 0,
      lordLevel: Number(fields['lord-level']) || 1,
      lordExp: Number(fields['lord-exp']) || 0,
      currentWorldId: fields['current-world-id'] ?? '',
      version: fields.version ?? GARDEN_SAVE_VERSION,
      lastSaved: Number(fields['last-saved']) || 0,
      ...json,
    };
  }

  writeGlobalSave(save: GardenGlobalSave): void {
    const json: GardenGlobalSaveJson = {
      unlockedBlueprints: save.unlockedBlueprints,
      unlockedWorlds: save.unlockedWorlds,
      playerState: save.playerState,
      economyLedger: save.economyLedger,
    };

    $tw.wiki.addTiddler({
      title: GARDEN_SAVE_GLOBAL_TITLE,
      'copper-coins': String(save.copperCoins),
      'gold-coins': String(save.goldCoins),
      'silver-coins': String(save.silverCoins),
      'lord-level': String(save.lordLevel),
      'lord-exp': String(save.lordExp),
      'current-world-id': save.currentWorldId,
      version: save.version,
      'last-saved': String(Date.now()),
      text: JSON.stringify(json),
    } as unknown as ITiddlerFields);
  }

  // ─── World Index ──────────────────────────────────────────────────────────

  readWorldIndex(): GardenWorldIndexItem[] {
    const tiddler = $tw.wiki.getTiddler(GARDEN_SAVE_WORLD_INDEX_TITLE);
    if (!tiddler?.fields.text) return [];
    try {
      return JSON.parse(String(tiddler.fields.text)) as GardenWorldIndexItem[];
    } catch {
      return [];
    }
  }

  writeWorldIndex(items: GardenWorldIndexItem[]): void {
    $tw.wiki.addTiddler({ title: GARDEN_SAVE_WORLD_INDEX_TITLE, text: JSON.stringify(items) } as unknown as ITiddlerFields);
  }

  // ─── World Meta ───────────────────────────────────────────────────────────

  readWorldMeta(worldId: string): GardenWorldMeta | undefined {
    const title = gardenWorldTiddlerTitle(worldId, 'meta');
    const tiddler = $tw.wiki.getTiddler(title);
    if (!tiddler) return undefined;

    const f = tiddler.fields as unknown as GardenWorldMetaTiddlerFields;
    return {
      id: worldId,
      name: String(f.name ?? ''),
      templateId: String(f['template-id'] ?? ''),
      width: Number(f.width) || 32,
      height: Number(f.height) || 32,
      weatherTheme: String(f['weather-theme'] ?? 'clear'),
      ambientAudioKey: String(f['ambient-audio-key'] ?? ''),
      roofVisibilityStrategy: (f['roof-visibility-strategy']) ?? 'auto',
    };
  }

  writeWorldMeta(meta: GardenWorldMeta): void {
    $tw.wiki.addTiddler({
      title: gardenWorldTiddlerTitle(meta.id, 'meta'),
      name: meta.name,
      'template-id': meta.templateId,
      width: String(meta.width),
      height: String(meta.height),
      'weather-theme': meta.weatherTheme,
      'ambient-audio-key': meta.ambientAudioKey,
      'roof-visibility-strategy': meta.roofVisibilityStrategy,
    } as unknown as ITiddlerFields);
  }

  // ─── World Grid ───────────────────────────────────────────────────────────

  readWorldGrid(worldId: string): GardenWorldGridData | undefined {
    const title = gardenWorldTiddlerTitle(worldId, 'grid');
    const tiddler = $tw.wiki.getTiddler(title);
    if (!tiddler?.fields.text) return undefined;
    try {
      return JSON.parse(String(tiddler.fields.text)) as GardenWorldGridData;
    } catch {
      return undefined;
    }
  }

  writeWorldGrid(worldId: string, grid: GardenWorldGridData): void {
    $tw.wiki.addTiddler({ title: gardenWorldTiddlerTitle(worldId, 'grid'), text: JSON.stringify(grid) } as unknown as ITiddlerFields);
  }

  // ─── World Objects ────────────────────────────────────────────────────────

  readWorldObjects(worldId: string): GardenWorldObjectRecord | undefined {
    const title = gardenWorldTiddlerTitle(worldId, 'objects');
    const tiddler = $tw.wiki.getTiddler(title);
    if (!tiddler?.fields.text) return undefined;
    try {
      return JSON.parse(String(tiddler.fields.text)) as GardenWorldObjectRecord;
    } catch {
      return undefined;
    }
  }

  writeWorldObjects(worldId: string, record: GardenWorldObjectRecord): void {
    $tw.wiki.addTiddler({ title: gardenWorldTiddlerTitle(worldId, 'objects'), text: JSON.stringify(record) } as unknown as ITiddlerFields);
  }

  // ─── World State ──────────────────────────────────────────────────────────

  readWorldState(worldId: string): GardenWorldState | undefined {
    const title = gardenWorldTiddlerTitle(worldId, 'state');
    const tiddler = $tw.wiki.getTiddler(title);
    if (!tiddler?.fields.text) return undefined;
    try {
      return JSON.parse(String(tiddler.fields.text)) as GardenWorldState;
    } catch {
      return undefined;
    }
  }

  writeWorldState(worldId: string, state: GardenWorldState): void {
    $tw.wiki.addTiddler({ title: gardenWorldTiddlerTitle(worldId, 'state'), text: JSON.stringify(state) } as unknown as ITiddlerFields);
  }

  // ─── Defaults ─────────────────────────────────────────────────────────────

  private defaultGlobalSave(): GardenGlobalSave {
    return {
      copperCoins: 0,
      goldCoins: 0,
      silverCoins: 0,
      lordLevel: 1,
      lordExp: 0,
      currentWorldId: '',
      version: GARDEN_SAVE_VERSION,
      lastSaved: 0,
      unlockedBlueprints: [],
      unlockedWorlds: [],
      playerState: this.defaultPlayerState(),
      economyLedger: this.defaultLedger(),
    };
  }

  private defaultPlayerState() {
    return { currentWorldId: '', tileX: 8, tileY: 8, direction: 'south' as const };
  }

  private defaultLedger() {
    return {
      periodStart: Date.now(),
      periodEnd: 0,
      copperEarned: 0,
      copperSpent: 0,
      goldEarned: 0,
      goldSpent: 0,
      silverEarned: 0,
      silverSpent: 0,
      blueprintsUnlocked: [],
      worldsUnlocked: [],
      smallRewardsConsumed: 0,
      largeRewardsConsumed: 0,
    };
  }
}
