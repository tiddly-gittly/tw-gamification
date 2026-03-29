/**
 * GardenGameWidget — TiddlyWiki widget entry point for the Digital Garden game.
 *
 * Responsibilities:
 * - Extend the tw-gamification GameWidget base class
 * - Create and destroy the PixiJS application lifecycle
 * - Receive tw-gamification reality events via setRealityEvents()
 * - Delegate all logic to GardenApp (Runtime) and domain systems
 *
 * Registered as TiddlyWiki widget "digital-garden-widget".
 * Used via the DigitalGarden macro in tiddlywiki-ui/game-procedure.tid.
 *
 * PLAN Phase 2 — bridge implementation
 */

import { Application } from '$:/plugins/linonetwo/pixijs/pixi.js';
import { GameWidget } from 'src/tw-gamification/types/GameWidgetType';
import type { IRealityEventCacheCacheFile } from 'src/tw-gamification/types/RealityEventCacheTypes';
import type { IChangedTiddlers } from 'tiddlywiki';
import { GardenApp } from '../runtime/garden-app';
import { EventBridgeSystem } from './event-bridge-system';

declare global {
  interface Window {
    __digitalGardenApp?: GardenApp;
  }
}

class DigitalGardenWidget extends GameWidget {
  private gardenApp: GardenApp | undefined;
  private containerEl: HTMLDivElement | undefined;
  private eventBridge: EventBridgeSystem | undefined;
  private destroyed = false;
  private pendingRechargeAmount = 0;

  render(parent: Element, nextSibling: Element | null): void {
    this.parentDomNode = parent;
    this.execute();

    const container = parent.ownerDocument.createElement('div');
    container.className = 'digital-garden-container';
    container.style.cssText = 'width:100%;height:100%;min-height:600px;position:relative;';
    parent.insertBefore(container, nextSibling);
    this.domNodes.push(container);
    this.containerEl = container;

    void this.initGame(container);
  }

  private async initGame(container: HTMLDivElement): Promise<void> {
    if (this.destroyed) return;

    const pixiApp = new Application();
    await pixiApp.init({
      resizeTo: container,
      backgroundColor: 0x2d5a27,
      antialias: false,
      resolution: window.devicePixelRatio ?? 1,
      autoDensity: true,
    });
    if (this.destroyed) {
      pixiApp.destroy(true);
      return;
    }

    container.appendChild(pixiApp.canvas);

    this.eventBridge = new EventBridgeSystem();
    this.gardenApp = new GardenApp(pixiApp, this.eventBridge);

    this.gardenApp.onRechargeRequested = (kind: 'SmallReward' | 'LargeReward', amount: number) => {
      this.pendingRechargeAmount = amount;
      this.popRealityEvents([kind]);
    };

    await this.gardenApp.init();
    window.__digitalGardenApp = this.gardenApp;
  }

  /**
   * Called by GameWikiProvider whenever cached reality events are available.
   * Returns remaining unconsumed items.
   */
  setRealityEvents(items: IRealityEventCacheCacheFile): boolean | IRealityEventCacheCacheFile | Promise<boolean | IRealityEventCacheCacheFile> {
    if (!this.gardenApp || !this.eventBridge) return false;
    return this.eventBridge.consumeEvents(items, this.pendingRechargeAmount);
  }

  refresh(_changedTiddlers: IChangedTiddlers): boolean {
    // Do NOT allow wiki changes to re-render and destroy the PixiJS app.
    // State is maintained via SaveScheduler, not re-render.
    return false;
  }

  destroy(): void {
    this.destroyed = true;
    this.gardenApp?.destroy();
    this.gardenApp = undefined;
    this.eventBridge = undefined;
    delete window.__digitalGardenApp;
  }
}

// Register with TiddlyWiki
declare let exports: { 'digital-garden-widget': typeof DigitalGardenWidget };
exports['digital-garden-widget'] = DigitalGardenWidget;
