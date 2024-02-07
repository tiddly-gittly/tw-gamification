#!/usr/bin/env zx

import { $, cd, path } from 'zx';

const gamePath = path.resolve(__dirname, '../src/scp-foundation-site-director/game');
/**
 * Build the game
 */
cd(gamePath);
await $`cargo build --release --target wasm32-unknown-unknown`;
await $`wasm-bindgen --omit-default-module-path --reference-types --weak-refs --out-name game --out-dir wasm --target web target/wasm32-unknown-unknown/release/game.wasm --debug`;
