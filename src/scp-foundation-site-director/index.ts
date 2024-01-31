import { IChangedTiddlers } from 'tiddlywiki';

import initAsync, { destroy, InitOutput, setGamificationEvents, startGame, stopGame } from './game/wasm/game';
import './index.css';
import { BasicGamificationEventTypes, IGamificationEvent } from 'src/tw-gamification/event-generator/GamificationEventTypes';
import { GameWidget } from 'src/tw-gamification/game-wiki-adaptor/GameWidgetType';

class ScpFoundationSiteDirectorGameWidget extends GameWidget {
  gameInstance?: InitOutput;
  gameInitialized = false;

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
    nextSibling === null ? parent.append(containerElement) : nextSibling.before(containerElement);
    this.domNodes.push(containerElement);
    // TODO: load assets from asset sub-plugin, and push list and item to game by call rust function
    this.startGame();
    // TODO: handle destroy using https://github.com/Jermolene/TiddlyWiki5/discussions/5945#discussioncomment-8173023
  }

  private startGame() {
    this.setLoading(true);
    /**
     * Delay init next game to next tick (game loop frame), so last game (if any) can be destroyed first.
     * Without setTimeout, there will be `already borrowed: BorrowMutError` `RuntimeError: unreachable executed` error, when switch from one game to another.
     *
     * // TODO: But sometimes there still be `Uncaught TypeError: wasm is undefined` `Uncaught RuntimeError: unreachable` `Uncaught TypeError: Cannot read properties of undefined (reading 'wasm_bindgen__convert__closures__invoke0_mut__h9f5f8d8886b9ec6c')` `Uncaught TypeError: Cannot read properties of undefined (reading '__wbindgen_export_3')` error, when switch from one game to another, maybe switch is too fast? Change from `0` to `1000` some times still cannot fixes this, and it slowdown the game init. And this error throw on global can't be catch here.
     */
    setTimeout(async () => {
      await this.initializeGameCanvas();
      if (this.gameInitialized) {
        this.popGamificationEvents();
      }
    }, 0);
  }

  public destroy(): void {
    super.destroy();
    stopGame();
  }

  private async initializeGameCanvas() {
    const gameWasm = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/scp-foundation-site-director/game_bg.wasm');
    // wasm is bundled into tw using `game/tiddlywiki.files` as base64

    if (gameWasm !== undefined) {
      const wasmBuffer = loadWasmModuleFromBase64(gameWasm);
      console.time('gameLoad'); // 384 ~ 1551 ms
      try {
        destroy();
        /**
         * Can't use `initSync`, it cause error:
         * > RangeError: WebAssembly.Compile is disallowed on the main thread, if the buffer size is larger than 8MB. Use WebAssembly.compile, compile on a worker thread
         */
        this.gameInstance = await initAsync(wasmBuffer);
        startGame();
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
    setGamificationEvents(JSON.stringify(gamificationEventsJSON));
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
