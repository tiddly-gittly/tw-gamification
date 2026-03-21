/**
 * GardenApp — PixiJS Application coordinator.
 *
 * Responsibilities:
 * - Construct and wire all domain and runtime systems
 * - Own the main game loop (PixiJS ticker)
 * - Handle world loading and switching
 * - Expose init() and destroy() for the widget lifecycle
 *
 * Layer order (bottom → top):
 *   0  groundLayer     — ground tiles
 *   1  objectLayer     — buildings and decorations (depth-sorted)
 *   2  characterLayer  — residents and lord (depth-sorted)
 *   3  roofLayer       — roof tiles (toggled by RoofVisibilitySystem)
 *   4  uiLayer         — placement ghost, selection highlight, HUD
 *
 * PLAN Phase 3 — runtime layer
 */

import { Application, Container, Ticker } from '$:/plugins/linonetwo/pixijs/pixi.js';
import type { EventBridgeSystem } from '../bridge/event-bridge-system';

import { ResourceAtlasSystem } from '../infra/resource-atlas-system';
import { SaveScheduler } from '../infra/save-scheduler';
import { TiddlerRepository } from '../infra/tiddler-repository';

import { BuildingOperationSystem } from '../domain/building-operation-system';
import { ContentBindingSystem } from '../domain/content-binding-system';
import { EconomySystem } from '../domain/economy-system';
import { MapGridSystem } from '../domain/map-grid-system';
import { PathfindingSystem } from '../domain/pathfinding-system';
import { PlacementSystem } from '../domain/placement-system';
import { PlayerSystem } from '../domain/player-system';
import { ResidentSystem } from '../domain/resident-system';
import { RoofVisibilitySystem } from '../domain/roof-visibility-system';
import { WorldRegistrySystem } from '../domain/world-registry-system';
import { WorldStateSystem } from '../domain/world-state-system';

import { AudioSystem } from './audio-system';
import { CameraSystem } from './camera-system';
import { InputSystem } from './input-system';
import { RenderSystem } from './render-system';
import { SortingSystem } from './sorting-system';
import { UiStateSystem } from './ui-state-system';

import { DEFAULT_ECONOMY_CONFIG } from '../../configs/default-economy-config';
import type { GardenBlueprintDefinition, GardenBlueprintTiddlerFields } from '../../types/building-types';

declare const $tw: {
  wiki: {
    getTiddler: (title: string) => { fields: Record<string, string | undefined> } | null;
    renderText: (outputType: string, textType: string, text: string) => string;
  };
};

export class GardenApp {
  // ─── Layers ───────────────────────────────────────────────────────────────
  readonly groundLayer = new Container();
  readonly objectLayer = new Container();
  readonly characterLayer = new Container();
  readonly roofLayer = new Container();
  readonly uiLayer = new Container();

  // ─── Systems ──────────────────────────────────────────────────────────────
  readonly repo: TiddlerRepository;
  readonly scheduler: SaveScheduler;
  readonly atlas: ResourceAtlasSystem;
  readonly economy: EconomySystem;
  readonly worldRegistry: WorldRegistrySystem;
  readonly worldState: WorldStateSystem;
  readonly mapGrid: MapGridSystem;
  readonly placement: PlacementSystem;
  readonly roofVisibility: RoofVisibilitySystem;
  readonly pathfinding: PathfindingSystem;
  readonly player: PlayerSystem;
  readonly residents: ResidentSystem;
  readonly buildingOps: BuildingOperationSystem;
  readonly content: ContentBindingSystem;
  readonly render: RenderSystem;
  readonly sorting: SortingSystem;
  readonly camera: CameraSystem;
  readonly input: InputSystem;
  readonly audio: AudioSystem;
  readonly ui: UiStateSystem;
  private readonly blueprintCache = new Map<string, GardenBlueprintDefinition>();
  private lastHudSync = 0;

  private ticker: Ticker | undefined;
  private destroyed = false;

  constructor(
    private readonly pixiApp: Application,
    private readonly bridge: EventBridgeSystem,
  ) {
    // Infra
    this.repo = new TiddlerRepository();
    this.scheduler = new SaveScheduler(this.repo);
    this.atlas = new ResourceAtlasSystem();

    // Domain
    this.economy = new EconomySystem(this.repo, this.scheduler);
    this.worldState = new WorldStateSystem(this.repo, this.scheduler);
    this.worldRegistry = new WorldRegistrySystem(this.repo, this.scheduler, this.economy);
    this.mapGrid = new MapGridSystem(this.worldState);
    this.placement = new PlacementSystem(this.mapGrid, this.worldState, this.economy);
    this.roofVisibility = new RoofVisibilitySystem(this.worldState, this.mapGrid);
    this.pathfinding = new PathfindingSystem(this.mapGrid);
    this.player = new PlayerSystem(this.worldState, this.pathfinding, this.roofVisibility);
    this.residents = new ResidentSystem(this.worldState, this.pathfinding, this.economy);
    this.buildingOps = new BuildingOperationSystem(this.worldState, this.economy, this.scheduler);
    this.content = new ContentBindingSystem();

    // Runtime
    this.render = new RenderSystem(this.pixiApp, this, this.atlas);
    this.sorting = new SortingSystem(this.objectLayer, this.characterLayer);
    this.camera = new CameraSystem(this.pixiApp, this.groundLayer, this.objectLayer, this.characterLayer, this.roofLayer, this.uiLayer);
    this.ui = new UiStateSystem();
    this.input = new InputSystem(
      this.pixiApp,
      this.camera,
      this.mapGrid,
      this.player,
      this.placement,
      this.ui,
      this.getBlueprintById.bind(this),
      this.economy,
      this.buildingOps,
      this.worldState,
    );
    this.audio = new AudioSystem(this.atlas);
  }

  async init(): Promise<void> {
    // camera-system automatically groups and adds the layers into a worldContainer on the stage.

    // Load resources
    await this.atlas.load();

    // Load global save and bootstrap economy
    const save = this.repo.readGlobalSave();
    this.economy.init(save, DEFAULT_ECONOMY_CONFIG);

    // Init world registry (creates flat world if none exists)
    this.worldRegistry.init();

    // Bootstrap starter economy for first-time players so placement can start immediately.
    // This runs only on empty saves.
    if (
      save.copperCoins <= 0 &&
      save.goldCoins === 0 &&
      save.silverCoins === 0 &&
      save.unlockedWorlds.length === 0 &&
      save.unlockedBlueprints.length === 0
    ) {
      save.copperCoins = 50;
      save.currentWorldId = save.currentWorldId || 'world-flat-default';
      save.unlockedWorlds.push('world-flat-default');
      this.scheduler.scheduleGlobalSave(save, 'immediate');
    }

    // Load initial world
    const worldId = save.currentWorldId || this.worldRegistry.getAll()[0]?.id;
    if (worldId) {
      await this.loadWorld(worldId);
    }

    // Warm up commonly used blueprints for placement hotkeys.
    this.preloadDefaultBlueprints();

    // Bind event bridge
    this.bridge.bind(this.economy);

    // Start game loop
    this.ticker = new Ticker();
    this.ticker.add(this.onTick.bind(this));
    this.ticker.start();

    // Initial HUD sync
    const updatedSave = this.repo.readGlobalSave();
    this.input.updateHud(updatedSave.copperCoins, updatedSave.goldCoins, updatedSave.silverCoins);
  }

  async loadWorld(worldId: string): Promise<void> {
    // Flush any pending saves from previous world
    await this.scheduler.flush();

    this.worldState.loadWorld(worldId);
    this.mapGrid.rebuildCollisionOverlay();
    this.worldRegistry.markVisited(worldId);

    this.render.rebuildWorld();
    const playerPos = this.mapGrid.tileToScreen(this.player.tileX, this.player.tileY);
    this.camera.centerOn(playerPos.x, playerPos.y);
    this.roofVisibility.update(this.player.tileX, this.player.tileY);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.ticker?.destroy();
    this.input.destroy();
    void this.scheduler.flush();
    this.atlas.destroy();
    this.render.destroy();
    this.worldState.unloadWorld();
    this.pixiApp.destroy(true);
  }

  // ─── Game loop ────────────────────────────────────────────────────────────

  private onTick(): void {
    if (this.destroyed || !this.worldState.isLoaded) return;
    const nowMs = Date.now();

    this.player.tick();
    this.residents.tick(nowMs);
    this.buildingOps.tick(nowMs);
    this.sorting.sort();
    this.render.update();
    this.render.updateGhost();

    // Sync HUD every ~500ms to avoid excessive DOM writes
    if (nowMs - this.lastHudSync > 500) {
      this.lastHudSync = nowMs;
      const save = this.repo.readGlobalSave();
      this.input.updateHud(save.copperCoins, save.goldCoins, save.silverCoins);
    }
  }

  getBlueprintById(id: string): GardenBlueprintDefinition | undefined {
    const cached = this.blueprintCache.get(id);
    if (cached) return cached;

    const title = `$:/plugins/linonetwo/digital-garden/blueprints/${id}`;
    const tiddler = $tw.wiki.getTiddler(title);
    if (!tiddler) return undefined;

    const fields = tiddler.fields as unknown as GardenBlueprintTiddlerFields;
    const parseJSON = <T>(value: string | undefined, fallback: T): T => {
      if (!value) return fallback;
      try {
        return JSON.parse(value) as T;
      } catch {
        return fallback;
      }
    };
    const parseBool = (value: string | undefined): boolean => {
      const v = (value ?? '').toLowerCase();
      return v === 'yes' || v === 'true';
    };
    const parseArray = (value: string | undefined): string[] => {
      return (value ?? '').split(/\s+/).map(s => s.trim()).filter(Boolean);
    };

    const renderWiki = (raw: string | undefined, fallback: string): string => {
      if (!raw) return fallback;
      // Handle <<lingo Key Base>> pattern by resolving the translation tiddler directly
      const lingoMatch = /^<<lingo\s+(\S+)\s+(\S+?)>>\s*$/.exec(raw);
      if (lingoMatch) {
        const [, key, base] = lingoMatch;
        // Determine language from $:/language (text = "$:/languages/zh-Hans")
        const langTiddler = $tw.wiki.getTiddler('$:/language');
        const langText = langTiddler?.fields.text ?? '';
        const lang = langText.replace('$:/languages/', '') || 'en-GB';
        const translationTitle = `${base}${lang}/${key}`;
        const translationTiddler = $tw.wiki.getTiddler(translationTitle);
        if (translationTiddler?.fields.text) return String(translationTiddler.fields.text);
      }
      // If it looks like a wiki macro, try renderText as fallback
      if (raw.includes('<<') || raw.includes('{{')) {
        try {
          const rendered = $tw.wiki.renderText('text/html', 'text/vnd.tiddlywiki', raw);
          if (rendered) {
            // Strip HTML tags
            const temporary = (globalThis as any).document?.createElement('div');
            if (temporary) {
              temporary.innerHTML = rendered;
              const text = temporary.textContent || '';
              if (text.trim()) return text.trim();
            }
          }
        } catch { /* ignore */ }
      }
      return raw || fallback;
    };

    const blueprint: GardenBlueprintDefinition = {
      id,
      caption: renderWiki(fields.caption, id),
      description: renderWiki(fields.description, ''),
      icon: fields.icon ?? '',
      category: (fields.category) ?? 'decoration',
      buildingWidth: Number(fields['building-width']) || 1,
      buildingHeight: Number(fields['building-height']) || 1,
      footprint: parseJSON(fields.footprint, [{ x: 0, y: 0 }]),
      atlasFrame: fields['atlas-frame'] ?? id,
      copperCost: Number(fields['copper-cost']) || 0,
      goldCost: Number(fields['gold-cost']) || 0,
      unlockRequiredLevel: Number(fields['unlock-required-level']) || 1,
      serviceTags: parseArray(fields['service-tags']),
      hasInterior: parseBool(fields['has-interior']),
      roofGroupTemplate: parseJSON(fields['roof-group-template'], null),
      doorNodeOffsets: parseJSON(fields['door-node-offsets'], []),
      maintenanceCost: Number(fields['maintenance-cost']) || 0,
      contentCapable: parseBool(fields['content-capable']),
      contentModes: parseArray(fields['content-modes']),
      enabled: parseBool(fields.enabled),
    };

    this.blueprintCache.set(id, blueprint);
    return blueprint;
  }

  private preloadDefaultBlueprints(): void {
    for (const id of ['bookshelf', 'bench', 'noticeboard']) {
      this.getBlueprintById(id);
    }
  }
}
