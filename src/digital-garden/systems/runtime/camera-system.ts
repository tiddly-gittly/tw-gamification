/**
 * CameraSystem — viewport pan, zoom, and follow.
 *
 * All five scene layers move together as a group.
 * The camera position is the world-space coordinate of the viewport center.
 *
 * PLAN Phase 3 — runtime layer
 */

import { Container } from '$:/plugins/linonetwo/pixijs/pixi.js';
import type { Application } from '$:/plugins/linonetwo/pixijs/pixi.js';

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;

export class CameraSystem {
  private worldX = 0;
  private worldY = 0;
  private _zoom = 1;
  private readonly worldContainer: Container;

  constructor(
    private readonly pixiApp: Application,
    ...layers: Container[]
  ) {
    this.worldContainer = new Container();
    for (const layer of layers) this.worldContainer.addChild(layer);
    this.pixiApp.stage.addChildAt(this.worldContainer, 0);
  }

  get zoom(): number {
    return this._zoom;
  }

  /** Pan the camera by a delta in screen pixels */
  pan(dx: number, dy: number): void {
    this.worldX -= dx / this._zoom;
    this.worldY -= dy / this._zoom;
    this.applyTransform();
  }

  /** Zoom toward a screen-space focal point */
  zoomAt(factor: number, screenFocalX: number, screenFocalY: number): void {
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this._zoom * factor));
    if (newZoom === this._zoom) return;

    // Adjust worldX/Y so the focal point stays fixed on screen
    const scaleRatio = newZoom / this._zoom;
    this.worldX = screenFocalX / newZoom - (screenFocalX / this._zoom - this.worldX) / scaleRatio;
    this.worldY = screenFocalY / newZoom - (screenFocalY / this._zoom - this.worldY) / scaleRatio;

    this._zoom = newZoom;
    this.applyTransform();
  }

  /** Instantly center the camera on a world-space coordinate */
  centerOn(worldSpaceX: number, worldSpaceY: number): void {
    const { width, height } = this.pixiApp.screen;
    this.worldX = worldSpaceX - width / 2 / this._zoom;
    this.worldY = worldSpaceY - height / 2 / this._zoom;
    this.applyTransform();
  }

  getWorldPosition(): { x: number; y: number } {
    return { x: this.worldX, y: this.worldY };
  }

  /** Convert screen coordinates to world-space coordinates */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX / this._zoom + this.worldX,
      y: screenY / this._zoom + this.worldY,
    };
  }

  private applyTransform(): void {
    this.worldContainer.scale.set(this._zoom);
    this.worldContainer.position.set(-this.worldX * this._zoom, -this.worldY * this._zoom);
  }
}
