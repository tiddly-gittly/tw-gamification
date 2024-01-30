import { IChangedTiddlers } from 'tiddlywiki';

import wbgInit, { InitOutput, set_gamification_events } from './game/wasm/game';
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
    void this.initializeGameCanvas().then(() => {
      if (this.gameInitialized) {
        this.popGamificationEvents();
      }
    });
    // TODO: handle destroy using https://github.com/Jermolene/TiddlyWiki5/discussions/5945#discussioncomment-8173023
  }

  private async initializeGameCanvas() {
    const gameWasm = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/scp-foundation-site-director/game_bg.wasm');
    // wasm is bundled into tw using `game/tiddlywiki.files` as base64

    if (gameWasm !== undefined) {
      const wasmBuffer = loadWasmModuleFromBase64(gameWasm);
      console.time('gameLoad'); // 384 ~ 1551 ms
      try {
        this.setLoading(true);
        this.gameInstance = await wbgInit(wasmBuffer);
      } catch (error) {
        // https://users.rust-lang.org/t/getting-rid-of-this-error-error-using-exceptions-for-control-flow-dont-mind-me-this-isnt-actually-an-error/92209
        // this cause `this.gameInstance` always undefined
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
    set_gamification_events(JSON.stringify(gamificationEventsJSON));
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
