/**
 * SortingSystem — 45-degree isometric depth sorting.
 *
 * Sort rule:
 *   depthKey = tileY * mapWidth + tileX + zOffset
 *
 * All objects in objectLayer and characterLayer are sorted by this key
 * each tick, so objects further south appear in front of northern ones.
 *
 * Performance note: avoid sorting every frame if the scene is large.
 * Use a dirty flag and only re-sort when objects move or are added/removed.
 *
 * PLAN Phase 3 — runtime layer
 */

import type { Container } from '$:/plugins/linonetwo/pixijs/pixi.js';

// PixiJS 8: use a minimal typed interface for sortable children
type SortableChild = { depthKey?: number } & Record<string, unknown>;

export class SortingSystem {
  private dirty = true;

  constructor(
    private readonly objectLayer: Container,
    private readonly characterLayer: Container,
  ) {}

  /** Mark the depth sort as stale (call when any object moves or is added) */
  markDirty(): void {
    this.dirty = true;
  }

  /** Re-sort object and character layers if dirty. Called each tick. */
  sort(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.sortLayer(this.objectLayer);
    this.sortLayer(this.characterLayer);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private sortLayer(layer: Container): void {
    const children = layer.children as unknown as SortableChild[];
    children.sort((a, b) => (a.depthKey ?? 0) - (b.depthKey ?? 0));
    // Re-apply sorted order to the layer
    for (let index = 0; index < children.length; index++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      layer.setChildIndex(children[index] as any, index);
    }
  }
}
