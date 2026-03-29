/**
 * RenderSystem — creates, updates, and destroys PixiJS display objects
 * that represent the game world.
 *
 * Ground tiles: created once per world load.
 * Buildings/decorations: created on placement, destroyed on removal.
 * Characters (lord, residents): updated each tick via SortingSystem.
 * Roof tiles: visibility delegated to RoofVisibilitySystem.
 *
 * When no atlas is loaded (Phase 6 assets not yet ready), the system draws
 * procedural placeholder Graphics so the isometric grid is visible.
 *
 * PLAN Phase 3 — runtime layer
 */

import { Assets, Container, Graphics, Rectangle, Sprite, Text, TextStyle, Texture } from '$:/plugins/linonetwo/pixijs/pixi.js';
import type { Application } from '$:/plugins/linonetwo/pixijs/pixi.js';
import type { GardenBlueprintDefinition } from '../../types/building-types';
import type { ResourceAtlasSystem } from '../infra/resource-atlas-system';
import type { GardenApp } from './garden-app';

// Palette for placeholder ground tiles
const GROUND_COLORS: Record<string, number> = {
  'ground-grass-01': 0x4a8f3f,
  'ground-grass-02': 0x3f7a35,
  'ground-path-01': 0xc4a46b,
  'ground-water-01': 0x3b7abf,
  default: 0x5a9e50,
};

export class RenderSystem {
  /** Map of building/decoration id → PixiJS Container */
  private objectSprites = new Map<string, Container>();
  /** Map of resident id → PixiJS Container */
  private residentSprites = new Map<string, Container>();
  private lordSprite: Container | undefined;
  private readonly boundOnRoofVisibilityChange: (hiddenGroups: ReadonlySet<string>) => void;

  constructor(
    private readonly pixiApp: Application,
    private readonly app: GardenApp,
    private readonly atlas: ResourceAtlasSystem,
  ) {
    this.boundOnRoofVisibilityChange = this.onRoofVisibilityChange.bind(this);
  }

  /** Rebuild the entire world visual from scratch after a world load */
  rebuildWorld(): void {
    this.clearAll();
    this.buildGroundTiles();
    this.buildObjectSprites();
    this.buildCharacterSprites();
    this.buildRoofTiles();

    // Listen for roof visibility changes
    this.app.roofVisibility.onVisibilityChange(this.boundOnRoofVisibilityChange);

    // Mark sorting as dirty so the first sort runs
    this.app.sorting.markDirty();
  }

  /** Called every tick to sync world state → display state */
  update(): void {
    this.syncObjectSprites();
    this.updateLord();
    this.updateResidents();
  }

  destroy(): void {
    this.app.roofVisibility.offVisibilityChange(this.boundOnRoofVisibilityChange);
    this.clearAll();
  }

  // ─── Ground tiles ─────────────────────────────────────────────────────────

  private buildGroundTiles(): void {
    if (!this.app.worldState.isLoaded) return;
    const { grid } = this.app.worldState;
    const tileSize = this.getTileSize();

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const frame = grid.cells[y][x].groundFrame;
        const tile = this.createGroundTile(frame, tileSize);
        const pos = this.app.mapGrid.tileToScreen(x, y);
        tile.position.set(pos.x, pos.y);
        this.app.groundLayer.addChild(tile);
      }
    }
  }

  private createGroundTile(frame: string, tileSize: number): Container {
    // Try atlas sprite first
    const sprite = this.trySprite(frame);
    if (sprite) {
      sprite.anchor.set(0.5, 1);
      const c = new Container();
      c.addChild(sprite);
      return c;
    }

    // Fallback: procedural isometric diamond
    const color = GROUND_COLORS[frame] ?? GROUND_COLORS['default'];
    const g = new Graphics();
    const halfW = tileSize / 2;
    const halfH = tileSize / 4;
    // Draw diamond anchored at bottom-center
    g.moveTo(0, -halfH * 2) // top
      .lineTo(halfW, -halfH) // right
      .lineTo(0, 0) // bottom (anchor)
      .lineTo(-halfW, -halfH) // left
      .fill({ color, alpha: 0.9 })
      .stroke({ color: 0x000000, alpha: 0.15, width: 1 });
    const c = new Container();
    c.addChild(g);
    return c;
  }

  // ─── Buildings / decorations ───────────────────────────────────────────────

  private buildObjectSprites(): void {
    if (!this.app.worldState.isLoaded) return;
    const tileSize = this.getTileSize();

    for (const building of this.app.worldState.objects.buildings) {
      this.addBuildingSprite(building.id, building.blueprintId, building.tileX, building.tileY, tileSize);
    }
    for (const deco of this.app.worldState.objects.decorations) {
      this.addBuildingSprite(deco.id, deco.blueprintId, deco.tileX, deco.tileY, tileSize);
    }
  }

  private syncObjectSprites(): void {
    if (!this.app.worldState.isLoaded) return;
    const tileSize = this.getTileSize();
    const expectedIds = new Set<string>();

    for (const building of this.app.worldState.objects.buildings) {
      expectedIds.add(building.id);
      this.addOrUpdateObjectSprite(building.id, building.blueprintId, building.tileX, building.tileY, tileSize);
    }
    for (const deco of this.app.worldState.objects.decorations) {
      expectedIds.add(deco.id);
      this.addOrUpdateObjectSprite(deco.id, deco.blueprintId, deco.tileX, deco.tileY, tileSize);
    }

    // Remove stale sprites whose instances were deleted.
    for (const [id, sprite] of this.objectSprites) {
      if (expectedIds.has(id)) continue;
      this.app.objectLayer.removeChild(sprite);
      this.objectSprites.delete(id);
      this.app.sorting.markDirty();
    }
  }

  private addOrUpdateObjectSprite(id: string, blueprintId: string, tileX: number, tileY: number, tileSize: number): void {
    const existing = this.objectSprites.get(id);
    if (!existing) {
      this.addBuildingSprite(id, blueprintId, tileX, tileY, tileSize);
      return;
    }

    const pos = this.app.mapGrid.tileToScreen(tileX, tileY);
    const nextDepth = tileY * 1000 + tileX;
    const currentDepth = (existing as Container & { depthKey?: number }).depthKey;
    existing.position.set(pos.x, pos.y);
    if (currentDepth !== nextDepth) {
      (existing as Container & { depthKey: number }).depthKey = nextDepth;
      this.app.sorting.markDirty();
    }
  }

  private addBuildingSprite(id: string, blueprintId: string, tileX: number, tileY: number, tileSize: number): void {
    const existing = this.objectSprites.get(id);
    if (existing) this.app.objectLayer.removeChild(existing);

    const container = this.createBuildingPlaceholder(blueprintId, tileSize);
    const pos = this.app.mapGrid.tileToScreen(tileX, tileY);
    container.position.set(pos.x, pos.y);
    // Depth key for isometric sort
    (container as Container & { depthKey: number }).depthKey = tileY * 1000 + tileX;
    this.app.objectLayer.addChild(container);
    this.objectSprites.set(id, container);
    this.app.sorting.markDirty();
  }

  private createBuildingPlaceholder(blueprintId: string, tileSize: number): Container {
    // Look up blueprint to get atlas frame and footprint dimensions
    const blueprint = this.app.getBlueprintById(blueprintId);
    const atlasFrame = blueprint?.atlasFrame ?? blueprintId;
    const bw = blueprint?.buildingWidth ?? 1;
    const bh = blueprint?.buildingHeight ?? 1;

    const sprite = this.trySprite(atlasFrame, blueprint?.atlasFrameRect ?? null);
    const container = new Container();

    // Always draw a footprint slab so multi-tile buildings visibly occupy tiles.
    const halfW = tileSize / 2;
    const halfH = tileSize / 4;
    const footprintBase = new Graphics();
    for (let fy = 0; fy < bh; fy++) {
      for (let fx = 0; fx < bw; fx++) {
        const tilePos = this.app.mapGrid.tileToScreen(fx, fy);
        footprintBase
          .moveTo(tilePos.x, tilePos.y - halfH * 2)
          .lineTo(tilePos.x + halfW, tilePos.y - halfH)
          .lineTo(tilePos.x, tilePos.y)
          .lineTo(tilePos.x - halfW, tilePos.y - halfH)
          .fill({ color: 0x6f5632, alpha: 0.35 })
          .stroke({ color: 0x2c2215, alpha: 0.35, width: 1 });
      }
    }
    container.addChild(footprintBase);

    if (sprite) {
      // Scale sprite proportionally based on its target grid footprint.
      const targetWidth = (bw + bh) * (tileSize / 2) * 1.2; // slight oversize looks good
      const scale = targetWidth / sprite.texture.width;
      sprite.scale.set(scale);
      // Anchor at bottom-center of footprint
      sprite.anchor.set(0.5, 1);
      sprite.position.set(0, -halfH * 0.5);
      container.addChild(sprite);
      return container;
    }

    // Fallback procedural building (used when atlas not loaded)
    const totalHalfW = (bw + bh) / 2 * halfW;
    const g = new Graphics();
    // Top face
    g.moveTo(0, -halfH * 2 * bh - halfH * 4)
      .lineTo(totalHalfW, -halfH * bh - halfH * 3)
      .lineTo(0, -halfH * 2 - halfH * 2)
      .lineTo(-totalHalfW, -halfH * bh - halfH * 3)
      .fill({ color: 0x8b5e3c, alpha: 0.95 });
    // Front face
    g.moveTo(0, -halfH * 2 - halfH * 2)
      .lineTo(totalHalfW, -halfH * bh - halfH * 3)
      .lineTo(totalHalfW, 0)
      .lineTo(0, halfH)
      .fill({ color: 0x6b4020, alpha: 0.95 })
      .stroke({ color: 0x000000, alpha: 0.3, width: 1 });

    const label = new Text({ text: blueprintId.replace('building-', '').slice(0, 5), style: new TextStyle({ fontSize: 8, fill: 0xffffff }) });
    label.anchor.set(0.5, 0.5);
    label.position.set(0, -halfH * 3);

    container.addChild(g);
    container.addChild(label);
    return container;
  }

  // ─── Characters ───────────────────────────────────────────────────────────

  private buildCharacterSprites(): void {
    const tileSize = this.getTileSize();

    // Lord sprite
    const lordContainer = this.createCharacterPlaceholder(0x4169e1, '城主', tileSize, 'character-lord');
    const lorPos = this.app.mapGrid.tileToScreen(this.app.player.tileX, this.app.player.tileY);
    lordContainer.position.set(lorPos.x, lorPos.y);
    (lordContainer as Container & { depthKey: number }).depthKey = this.app.player.tileY * 1000 + this.app.player.tileX + 0.5;
    this.app.characterLayer.addChild(lordContainer);
    this.lordSprite = lordContainer;

    // Residents
    if (!this.app.worldState.isLoaded) return;
    for (const resident of this.app.worldState.objects.residents) {
      const residentContainer = this.createCharacterPlaceholder(0xe08040, 'NPC', tileSize, 'character-npc');
      const residentPos = this.app.mapGrid.tileToScreen(resident.tileX, resident.tileY);
      residentContainer.position.set(residentPos.x, residentPos.y);
      (residentContainer as Container & { depthKey: number }).depthKey = resident.tileY * 1000 + resident.tileX + 0.5;
      this.app.characterLayer.addChild(residentContainer);
      this.residentSprites.set(resident.id, residentContainer);
    }
  }

  private createCharacterPlaceholder(color: number, label: string, tileSize: number, atlasFrame?: string): Container {
    if (atlasFrame) {
      const sprite = this.trySprite(atlasFrame);
      if (sprite) {
        sprite.anchor.set(0.5, 1);
        sprite.position.set(0, -tileSize * 0.1); 
        const c = new Container();
        c.addChild(sprite);
        return c;
      }
    }

    const r = tileSize * 0.18;
    const g = new Graphics();
    g.circle(0, -r * 2, r)
      .fill({ color, alpha: 0.95 })
      .stroke({ color: 0x000000, alpha: 0.3, width: 1 });

    const txt = new Text({ text: label, style: new TextStyle({ fontSize: 7, fill: 0xffffff }) });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(0, -r * 2);

    const c = new Container();
    c.addChild(g);
    c.addChild(txt);
    return c;
  }

  // ─── Roof tiles ────────────────────────────────────────────────────────────

  private buildRoofTiles(): void {
    if (!this.app.worldState.isLoaded) return;
    const tileSize = this.getTileSize();

    for (const roofGroup of this.app.worldState.objects.roofGroups) {
      const container = new Container();
      (container as Container & { roofGroupId: string }).roofGroupId = roofGroup.id;

      // Draw roof tile placeholders for each wall-occlude tile
      for (const tile of roofGroup.wallOccludeTiles) {
        const g = new Graphics();
        const halfW = tileSize / 2;
        const halfH = tileSize / 4;
        g.moveTo(0, -halfH * 2)
          .lineTo(halfW, -halfH)
          .lineTo(0, 0)
          .lineTo(-halfW, -halfH)
          .fill({ color: 0x7a5c3a, alpha: 0.75 });
        const pos = this.app.mapGrid.tileToScreen(tile.x, tile.y);
        g.position.set(pos.x, pos.y);
        container.addChild(g);
      }
      this.app.roofLayer.addChild(container);
    }
  }

  // ─── Per-tick updates ──────────────────────────────────────────────────────

  private updateLord(): void {
    if (!this.lordSprite) return;
    const pos = this.app.mapGrid.tileToScreen(this.app.player.tileX, this.app.player.tileY);
    this.lordSprite.position.set(pos.x, pos.y);
    (this.lordSprite as Container & { depthKey: number }).depthKey = this.app.player.tileY * 1000 + this.app.player.tileX + 0.5;
    this.app.sorting.markDirty();
  }

  private updateResidents(): void {
    if (!this.app.worldState.isLoaded) return;
    for (const resident of this.app.worldState.objects.residents) {
      const sprite = this.residentSprites.get(resident.id);
      if (!sprite) continue;
      const pos = this.app.mapGrid.tileToScreen(resident.tileX, resident.tileY);
      sprite.position.set(pos.x, pos.y);
      (sprite as Container & { depthKey: number }).depthKey = resident.tileY * 1000 + resident.tileX + 0.5;
    }
  }

  // ─── Roof visibility callback ──────────────────────────────────────────────

  private onRoofVisibilityChange(hiddenGroups: ReadonlySet<string>): void {
    for (const child of this.app.roofLayer.children) {
      const roofGroupId = (child as Container & { roofGroupId?: string }).roofGroupId;
      if (roofGroupId !== undefined) {
        child.visible = !hiddenGroups.has(roofGroupId);
      }
    }
  }

  // ─── Placement ghost ──────────────────────────────────────────────────────

  private ghostContainer: Container | undefined;
  private ghostBlueprintId: string | undefined;

  /** Called each tick to show/hide/update the placement ghost preview */
  updateGhost(): void {
    const ghost = this.app.ui.placementGhost;
    if (!ghost) {
      if (this.ghostContainer) {
        this.app.uiLayer.removeChild(this.ghostContainer);
        this.ghostContainer = undefined;
        this.ghostBlueprintId = undefined;
      }
      return;
    }

    // Recreate ghost if blueprint changed
    if (!this.ghostContainer || this.ghostBlueprintId !== ghost.blueprint.id) {
      if (this.ghostContainer) this.app.uiLayer.removeChild(this.ghostContainer);
      this.ghostContainer = this.createGhostGraphic(ghost.blueprint, this.getTileSize());
      this.ghostBlueprintId = ghost.blueprint.id;
      this.app.uiLayer.addChild(this.ghostContainer);
    }

    const pos = this.app.mapGrid.tileToScreen(ghost.tileX, ghost.tileY);
    this.ghostContainer.position.set(pos.x, pos.y);
    this.ghostContainer.alpha = ghost.valid ? 0.6 : 0.35;
    // Tint: green for valid, red for invalid
    const tint = ghost.valid ? 0x44ff44 : 0xff4444;
    for (const child of this.ghostContainer.children) {
      if ('tint' in child) (child as Sprite & { tint: number }).tint = tint;
    }
  }

  private createGhostGraphic(blueprint: GardenBlueprintDefinition, tileSize: number): Container {
    const halfW = tileSize / 2;
    const halfH = tileSize / 4;
    const container = new Container();

    // Draw footprint tiles
    for (const offset of blueprint.footprint) {
      const g = new Graphics();
      g.moveTo(0, -halfH * 2)
        .lineTo(halfW, -halfH)
        .lineTo(0, 0)
        .lineTo(-halfW, -halfH)
        .fill({ color: 0xffffff, alpha: 0.5 })
        .stroke({ color: 0xffffff, alpha: 0.8, width: 2 });
      const cellPos = this.app.mapGrid.tileToScreen(offset.x, offset.y);
      g.position.set(cellPos.x, cellPos.y);
      container.addChild(g);
    }

    // Try to show actual building sprite as ghost
    const sprite = this.trySprite(blueprint.atlasFrame, blueprint.atlasFrameRect ?? null);
    if (sprite) {
      const bw = blueprint.buildingWidth;
      const bh = blueprint.buildingHeight;
      const targetWidth = (bw + bh) * (tileSize / 2) * 1.2;
      const scale = targetWidth / sprite.texture.width;
      sprite.scale.set(scale);
      sprite.anchor.set(0.5, 1);
      container.addChild(sprite);
      return container;
    }

    // Fallback procedural shape
    const buildG = new Graphics();
    buildG.moveTo(0, -halfH * 4)
      .lineTo(halfW * 0.8, -halfH * 3)
      .lineTo(0, -halfH * 2)
      .lineTo(-halfW * 0.8, -halfH * 3)
      .fill({ color: 0xffffff, alpha: 0.4 })
      .stroke({ color: 0xffffff, alpha: 0.6, width: 1 });
    container.addChild(buildG);

    // Label
    const label = new Text({
      text: blueprint.caption.slice(0, 6),
      style: new TextStyle({ fontSize: 9, fill: 0xffffff }),
    });
    label.anchor.set(0.5, 0.5);
    label.position.set(0, -halfH * 3);
    container.addChild(label);

    return container;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private clearAll(): void {
    this.app.groundLayer.removeChildren();
    this.app.objectLayer.removeChildren();
    this.app.characterLayer.removeChildren();
    this.app.roofLayer.removeChildren();
    this.objectSprites.clear();
    this.residentSprites.clear();
    this.lordSprite = undefined;
  }

  private trySprite(frame: string, frameRect: { x: number; y: number; width: number; height: number } | null = null): Sprite | undefined {
    // We try to get the texture. If it's loaded, it works.
    try {
      const tex = Assets.get(frame) as Texture | undefined;
      if (!tex) return undefined;

      const usableTexture = frameRect
        ? new Texture({
            source: (tex as Texture & { source: unknown }).source,
            frame: new Rectangle(frameRect.x, frameRect.y, frameRect.width, frameRect.height),
          } as never)
        : tex;

      const s = Sprite.from(usableTexture);
      if (s.texture.width <= 1 && s.texture.height <= 1) return undefined;
      return s;
    } catch {
      return undefined;
    }
  }

  private getTileSize(): number {
    // TODO: read from config tiddler at runtime
    return 64;
  }
}
