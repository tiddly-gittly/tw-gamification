import { ConnectionObserver } from '@wessberg/connection-observer';
import { IChangedTiddlers } from 'tiddlywiki';

import { getWasmContext, WasmContext } from './game/wasm/game';
import './index.css';
import { BasicGamificationEventTypes, IGamificationEvent } from 'src/tw-gamification/event-generator/GamificationEventTypes';
import { GameWidget } from 'src/tw-gamification/game-wiki-adaptor/GameWidgetType';

class ScpFoundationSiteDirectorGameWidget extends GameWidget {
  wasmContext?: WasmContext;
  gameInitialized = false;
  connectionObserver?: ConnectionObserver;

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
    this.connectionObserver = new ConnectionObserver(entries => {
      // For each entry, print the connection state as well as the target node to the console
      for (const { connected, target } of entries) {
        // connected will be false when it first time created and not appended to parent DOM
        if (!connected && this.gameInitialized) {
          this.destroy();
          this.connectionObserver?.disconnect?.();
        }
      }
    });
    this.connectionObserver.observe(canvasElement);
    nextSibling === null ? parent.append(containerElement) : nextSibling.before(containerElement);
    this.domNodes.push(containerElement);
    // TODO: load assets from asset sub-plugin, and push list and item to game by call rust function
    void this.startGame();
    // TODO: handle destroy using https://github.com/Jermolene/TiddlyWiki5/discussions/5945#discussioncomment-8173023
  }

  private async startGame() {
    this.setLoading(true);
    await this.initializeGameCanvas();
    if (this.gameInitialized) {
      this.popGamificationEvents();
    }
  }

  destroy(): void {
    this.wasmContext?.stopGame?.();
    this.wasmContext = undefined;
    this.gameInitialized = false;
  }

  private async initializeGameCanvas() {
    const gameWasm = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/scp-foundation-site-director/game_bg.wasm');
    // wasm is bundled into tw using `game/tiddlywiki.files` as base64

    if (gameWasm !== undefined) {
      const wasmBuffer = loadWasmModuleFromBase64(gameWasm);
      console.time('gameLoad'); // 384 ~ 1551 ms
      try {
        this.wasmContext = getWasmContext();
        /**
         * Use `initAsync` for large wasm.
         *
         * Can't use `initSync`, it cause error:
         * > RangeError: WebAssembly.Compile is disallowed on the main thread, if the buffer size is larger than 8MB. Use WebAssembly.compile, compile on a worker thread
         */
        await this.wasmContext.initAsync(wasmBuffer);
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
      console.timeEnd('gameLoad');
      this.setGamificationEvents([{
        type: BasicGamificationEventTypes.LargeReward,
        signature: 'test',
        timestamp: Date.now(),
        amount: 3,
        message: 'testtest',
      }]);
    }
  }

  private setLoading(loading: boolean) {
    if (loading) {
      $tw.wiki.addTiddler({ title: '$:/state/tw-gamification/scp-foundation-site-director/loading', text: 'yes' });
    } else {
      $tw.wiki.deleteTiddler('$:/state/tw-gamification/scp-foundation-site-director/loading');
    }
  }

  public setGamificationEvents(gamificationEventsJSON: IGamificationEvent[]) {
    if (!this.gameInitialized) {
      // TODO: store gamification events in a tiddler, and push them to game when game is initialized
      throw new Error('Game is not initialized yet!');
    }
    this.wasmContext?.setGamificationEvents?.(JSON.stringify(gamificationEventsJSON));
  }
}

function loadWasmModuleFromBase64(encodedWasm: string) {
  // Decode the base64 string to binary data
  console.time('wasmDecode'); // 157 ~ 445 ms
  const binaryString = window.atob(encodedWasm);
  const binaryLength = binaryString.length;
  const bytes = new Uint8Array(binaryLength);
  // Convert the binary string to a byte array
  for (let index = 0; index < binaryLength; index++) {
    bytes[index] = binaryString.codePointAt(index)!;
  }
  console.timeEnd('wasmDecode');
  return bytes;
}

declare let exports: {
  ScpFoundationSiteDirectorGameWidget: typeof ScpFoundationSiteDirectorGameWidget;
};
exports.ScpFoundationSiteDirectorGameWidget = ScpFoundationSiteDirectorGameWidget;
