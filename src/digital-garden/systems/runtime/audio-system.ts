/**
 * AudioSystem — sound effect playback for building and economy feedback.
 *
 * First version: effects only, no voice acting.
 * Sound keys must match entries in assets/manifest/audio-manifest.json.
 *
 * Priority sound keys:
 *   place-success       — placement confirmed
 *   place-cancel        — placement cancelled
 *   delete              — building deleted
 *   rotate              — building rotated
 *   buy-success         — blueprint purchased
 *   insufficient-funds  — not enough currency
 *   blueprint-unlock    — blueprint unlocked
 *   world-unlock        — world unlocked
 *
 * PLAN Phase 5 — runtime layer
 */

import type { ResourceAtlasSystem } from '../infra/resource-atlas-system';

export class AudioSystem {
  constructor(private readonly atlas: ResourceAtlasSystem) {}

  playPlaceSuccess(): void {
    this.play('place-success');
  }
  playPlaceCancel(): void {
    this.play('place-cancel');
  }
  playDelete(): void {
    this.play('delete');
  }
  playRotate(): void {
    this.play('rotate');
  }
  playBuySuccess(): void {
    this.play('buy-success');
  }
  playInsufficientFunds(): void {
    this.play('insufficient-funds');
  }
  playBlueprintUnlock(): void {
    this.play('blueprint-unlock');
  }
  playWorldUnlock(): void {
    this.play('world-unlock');
  }

  private play(key: string): void {
    this.atlas.playSound(key);
  }
}
