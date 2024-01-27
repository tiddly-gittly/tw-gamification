import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { IChangedTiddlers } from 'tiddlywiki';

import { initSync } from './game/wasm/game';
import './index.css';

class ScpFoundationSiteDirectorGameWidget extends Widget {
  refresh(_changedTiddlers: IChangedTiddlers) {
    return false;
  }

  render(parent: Element, nextSibling: Element) {
    this.parentDomNode = parent;
    this.execute();
    const containerElement = $tw.utils.domMaker('div', {
      text: 'Loading game...',
    });
    nextSibling === null ? parent.append(containerElement) : nextSibling.before(containerElement);
    this.domNodes.push(containerElement);

    const gameWasm = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/scp-foundation-site-director/game_bg.wasm');
    // wasm is bundled into tw using `game/tiddlywiki.files` as base64

    if (gameWasm !== undefined) {
      const wasmBuffer = loadWasmModuleFromBase64(gameWasm);
      console.time('gameLoad'); // 384 ms
      try {
        initSync(wasmBuffer);
      } catch (error) {
        console.error('Game load with error', error);
      }
      console.timeEnd('gameLoad');
    }
  }
}

function loadWasmModuleFromBase64(encodedWasm: string) {
  // Decode the base64 string to binary data
  console.time('wasmDecode'); // 157 ms
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
