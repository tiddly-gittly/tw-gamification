#!/usr/bin/env zx

import { appendFile } from 'fs/promises';
import { $, cd, path } from 'zx';

const gamePath = path.resolve(__dirname, '../src/scp-foundation-site-director/game');
/**
 * Build the game
 */
cd(gamePath);
await $`cargo build --release --target wasm32-unknown-unknown`;
await $`wasm-bindgen --omit-default-module-path --reference-types --weak-refs --out-name game --out-dir wasm --target web target/wasm32-unknown-unknown/release/game.wasm --debug`;

/**
 * Fix Wasm Bindgen No Destroy Method
 */
// JS snippet to append
const jsSnippet = `
export function destroy() {
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
`;

// Path to the wasm bindgen generated JS file
const jsFilePath = path.resolve(gamePath, 'wasm/game.js');
const tsFilePath = path.resolve(gamePath, 'wasm/game.d.ts');

try {
  // Append JS snippet
  await appendFile(jsFilePath, jsSnippet);
  console.log('JS snippet appended successfully.');

  // Append TS definition
  await appendFile(tsFilePath, tsDefinition);
  console.log('TS definition appended successfully.');
} catch (error) {
  console.error('Failed to append to file:', error);
}
