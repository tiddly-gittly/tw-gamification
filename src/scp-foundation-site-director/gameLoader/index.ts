import { observe, unobserve } from '@seznam/visibility-observer';
import { IChangedTiddlers } from 'tiddlywiki';

import './index.css';
import { GameWidget } from 'src/tw-gamification/game-wiki-adaptor/GameWidgetType';
import { IRealityEventCacheCacheFile } from 'src/tw-gamification/reality-event-cache/RealityEventCacheTypes';
import { BasicRealityEventTypes } from 'src/tw-gamification/reality-event-generator/reality-event-types/RealityEventTypes';
import { loadGameModuleFromJSString, loadWasmModuleFromBase64 } from './loadModules';
import { IGameContext } from './types';

class ScpFoundationSiteDirectorGameWidget extends GameWidget {
  wasmContext: typeof IGameContext | undefined;
  gameInitialized = false;
  onVisibilityChange(
    visibilityEntry: IntersectionObserverEntry & {
      target: HTMLElement;
    },
  ) {
    if (!visibilityEntry.isIntersecting && this.gameInitialized) {
      this.destroy();
      unobserve(visibilityEntry.target, this.onVisibilityChange.bind(this));
    }
  }

  refresh(_changedTiddlers: IChangedTiddlers) {
    // noting should trigger game refresh (reloading), because it is self-contained. Game state change is triggered by calling method on wasm.
    return false;
  }

  render(parent: Element, nextSibling: Element) {
    this.parentDomNode = parent;
    this.execute();
    const canvasElement = $tw.utils.domMaker('canvas', {
      class: 'tw-gamification-bevy-canvas scp-foundation-site-director',
    });
    const containerElement = $tw.utils.domMaker('div', {
      class: 'tw-gamification-bevy-container',
      children: [canvasElement],
    });
    observe(canvasElement, this.onVisibilityChange.bind(this));
    nextSibling === null ? parent.append(containerElement) : nextSibling.before(containerElement);
    this.domNodes.push(containerElement);
    // TODO: load assets from asset sub-plugin, and push list and item to game by call rust function
    void this.startGame();
  }

  private async startGame() {
    this.setLoading(true);
    await this.initializeGameCanvas();
    if (this.gameInitialized) {
      // this.popRealityEvents();
    }
  }

  private async initializeGameCanvas() {
    try {
      const wasmBuffer = loadWasmModuleFromBase64();
      this.wasmContext = await loadGameModuleFromJSString();
      console.time('load game'); // 442 ms
      /**
       * Use `initAsync` for large wasm.
       *
       * Can't use `initSync`, it cause error:
       * > RangeError: WebAssembly.Compile is disallowed on the main thread, if the buffer size is larger than 8MB. Use WebAssembly.compile, compile on a worker thread
       */
      await this.wasmContext.default(wasmBuffer);
      this.wasmContext.startGame();
    } catch (error) {
      // https://users.rust-lang.org/t/getting-rid-of-this-error-error-using-exceptions-for-control-flow-dont-mind-me-this-isnt-actually-an-error/92209
      // this throw from `startGame()`, but don't hurt anything.
      if ((error as Error).message.includes('Using exceptions for control flow')) {
        this.gameInitialized = true;
      } else {
        console.error('Game load with error', error);
      }
    } finally {
      this.setLoading(false);
    }
    console.timeEnd('load game');
    this.setRealityEvents([{
      event: {
        type: BasicRealityEventTypes.LargeReward,
        timestamp: Date.now(),
        amount: 3,
        message: 'testtest',
      },
    }]);
  }

  destroy(): void {
    this.wasmContext?.stopGame?.();
    this.wasmContext = undefined;
    this.gameInitialized = false;
  }

  private setLoading(loading: boolean) {
    if (loading) {
      $tw.wiki.addTiddler({ title: '$:/state/tw-gamification/scp-foundation-site-director/loading', text: 'yes' });
    } else {
      $tw.wiki.deleteTiddler('$:/state/tw-gamification/scp-foundation-site-director/loading');
    }
  }

  public setRealityEvents(_gamificationEventsJSON: IRealityEventCacheCacheFile) {
    if (!this.gameInitialized) {
      // TODO: store gamification events in a tiddler, and push them to game when game is initialized
      throw new Error('Game is not initialized yet!');
    }
    // this.wasmContext?.setRealityEvents?.(JSON.stringify(gamificationEventsJSON));
    return true;
  }
}

declare let exports: {
  ScpFoundationSiteDirectorGameWidget: typeof ScpFoundationSiteDirectorGameWidget;
};
exports.ScpFoundationSiteDirectorGameWidget = ScpFoundationSiteDirectorGameWidget;
