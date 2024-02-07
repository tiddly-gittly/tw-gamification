import { IGameContext } from './types';

export function loadWasmModuleFromBase64() {
  // Decode the base64 string to binary data
  console.time('wasmDecode'); // 591 ms
  // wasm is bundled into tw using `game/tiddlywiki.files` as base64
  const encodedWasm = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/scp-foundation-site-director/game/game_bg.wasm');
  if (encodedWasm === undefined) {
    throw new Error('Game wasm is not found!');
  }
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

export async function loadGameModuleFromJSString() {
  console.time('load game code'); // 112 ms
  // we parse and run the code on runtime, to create a new JS context each time, to prevent reuse last game's wasm.
  const wasmBindGenJSCode = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/scp-foundation-site-director/game/game.js');
  if (wasmBindGenJSCode === undefined) {
    throw new Error('Game js code is not found!');
  }
  const blob = new Blob([wasmBindGenJSCode], { type: 'text/javascript' });
  const objectURL = URL.createObjectURL(blob);
  // use `await import` to create a new JS context each time, to prevent reuse last game's wasm.
  const gameModule = await import(objectURL) as typeof IGameContext;
  URL.revokeObjectURL(objectURL);
  console.timeEnd('load game code');
  return gameModule;
}
