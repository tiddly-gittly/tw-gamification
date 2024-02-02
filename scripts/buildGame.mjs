#!/usr/bin/env zx

import { appendFile, readFile, writeFile } from 'fs/promises';
import { $, cd, path } from 'zx';

const gamePath = path.resolve(__dirname, '../src/scp-foundation-site-director/game');
/**
 * Build the game
 */
cd(gamePath);
await $`cargo build --release --target wasm32-unknown-unknown`;
await $`wasm-bindgen --omit-default-module-path --reference-types --weak-refs --out-name game --out-dir wasm --target no-modules target/wasm32-unknown-unknown/release/game.wasm --debug`;

/**
 * Fix Wasm Bindgen No Destroy Method
 */
// JS snippet to append
const jsSnippet = `
function destroy() {
    wasm = undefined;
    __wbg_init.__wbindgen_wasm_module = undefined;
    cachedFloat32Memory0 = null;
    cachedFloat64Memory0 = null;
    cachedInt32Memory0 = null;
    cachedUint32Memory0 = null;
    cachedUint8Memory0 = null;
}
`;

// TS definition to append
const tsDefinition = `
/**
 * remove previous game, to prevent \`Creating EventLoop multiple times is not supported.\` error.
 * @url https://github.com/bevyengine/bevy/discussions/11619
 */
export function destroy(): void;
export type WasmContext = typeof WasmBindgen & { initAsync: typeof initAsync }
/**
 * Create a new wasm context.
 * 
 * ## If reuse previous one:
 * 
 * There will be \`already borrowed: BorrowMutError\` \`RuntimeError: unreachable executed\` error, when switch from one game to another.
 *
 * And sometimes there still be \`Uncaught TypeError: wasm is undefined\` \`Uncaught RuntimeError: unreachable\` \`Uncaught TypeError: Cannot read properties of undefined (reading 'wasm_bindgen__convert__closures__invoke0_mut__h9f5f8d8886b9ec6c')\` \`Uncaught TypeError: Cannot read properties of undefined (reading '__wbindgen_export_3')\` error, when switch from one game to another, maybe switch is too fast? Change from \`0\` to \`1000\` some times still cannot fixes this, even the game should have been stopped. And it slowdown the game init. And this error throw on global can't be catch here.
 */
export function getWasmContext(): WasmContext;
`;

// Path to the wasm bindgen generated JS file
const jsFilePath = path.resolve(gamePath, 'wasm/game.js');
const tsFilePath = path.resolve(gamePath, 'wasm/game.d.ts');

try {
  // Append JS snippet
  // await appendFile(jsFilePath, jsSnippet);
  const jsFile = await readFile(jsFilePath, 'utf8');
  await writeFile(
    jsFilePath,
    jsFile
      .replace('wasm_bindgen = Object.assign(__wbg_init, { initSync }, __exports);', 'return { initAsync: __wbg_init, initSync, ...__exports };')
      .replace('})();', '}')
      .replace(
        `let wasm_bindgen;
(function() {`,
        'export function getWasmContext() {',
      ),
  );
  console.log('JS snippet appended successfully.');

  // Append TS definition
  const tsFile = await readFile(tsFilePath, 'utf8');
  await writeFile(
    tsFilePath,
    tsFile
      .replace('declare namespace wasm_bindgen', 'declare namespace WasmBindgen')
      .replace('declare function wasm_bindgen', 'function initAsync'),
  );
  await appendFile(tsFilePath, tsDefinition);
  console.log('TS definition appended successfully.');
} catch (error) {
  console.error('Failed to append to file:', error);
}
