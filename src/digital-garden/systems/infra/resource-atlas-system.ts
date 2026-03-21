/**
 * ResourceAtlasSystem — loads atlas sprite sheets and audio manifest at startup.
 *
 * Atlas manifest format (assets/manifest/atlas-manifest.json):
 * {
 *   "atlases": [
 *     { "key": "tiles", "url": "<tiddler-title-or-data-uri>" },
 *     { "key": "buildings", "url": "..." },
 *     { "key": "characters", "url": "..." }
 *   ]
 * }
 *
 * Audio manifest format (assets/manifest/audio-manifest.json):
 * {
 *   "sounds": {
 *     "place-success": { "url": "..." },
 *     "place-cancel": { "url": "..." },
 *     "buy-success": { "url": "..." },
 *     "insufficient-funds": { "url": "..." },
 *     "blueprint-unlock": { "url": "..." },
 *     "delete": { "url": "..." },
 *     "rotate": { "url": "..." },
 *     "world-unlock": { "url": "..." }
 *   }
 * }
 *
 * PLAN Phase 2 — infra layer
 */

import { Assets } from '$:/plugins/linonetwo/pixijs/pixi.js';

export interface AtlasEntry {
  key: string;
  url: string;
}

export interface SoundEntry {
  url: string;
}

export interface AtlasManifest {
  atlases: AtlasEntry[];
}

export interface AudioManifest {
  sounds: Record<string, SoundEntry>;
}

export class ResourceAtlasSystem {
  private audioBuffers = new Map<string, AudioBuffer>();
  private audioContext: AudioContext | undefined;
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;

    const [atlasManifest, audioManifest] = await Promise.all([
      this.loadAtlasManifest(),
      this.loadAudioManifest(),
    ]);

    // Load all atlas sprites via PixiJS Assets
    await Promise.all(
      atlasManifest.atlases.map(({ key, url }) => Assets.load({ alias: key, src: url })),
    );

    // Preload audio buffers
    await this.loadAudioBuffers(audioManifest);

    this.loaded = true;
  }

  playSound(key: string, volume = 1): void {
    const buffer = this.audioBuffers.get(key);
    if (!buffer) return;

    const context = this.getAudioContext();
    const source = context.createBufferSource();
    source.buffer = buffer;

    const gainNode = context.createGain();
    gainNode.gain.value = volume;
    source.connect(gainNode).connect(context.destination);
    source.start();
  }

  destroy(): void {
    this.audioBuffers.clear();
    // Note: do NOT close AudioContext — it may be shared across reloads
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async loadAtlasManifest(): Promise<AtlasManifest> {
    try {
      const tiddler = (globalThis as { $tw?: { wiki: { getTiddler(t: string): { fields: { text: string } } | null } } }).$tw?.wiki.getTiddler(
        '$:/plugins/linonetwo/digital-garden/assets/manifest/atlas-manifest.json',
      );
      if (tiddler?.fields.text) return JSON.parse(tiddler.fields.text) as AtlasManifest;
    } catch { /* fall through */ }
    return { atlases: [] };
  }

  private async loadAudioManifest(): Promise<AudioManifest> {
    try {
      const tiddler = (globalThis as { $tw?: { wiki: { getTiddler(t: string): { fields: { text: string } } | null } } }).$tw?.wiki.getTiddler(
        '$:/plugins/linonetwo/digital-garden/assets/manifest/audio-manifest.json',
      );
      if (tiddler?.fields.text) return JSON.parse(tiddler.fields.text) as AudioManifest;
    } catch { /* fall through */ }
    return { sounds: {} };
  }

  private async loadAudioBuffers(manifest: AudioManifest): Promise<void> {
    const context = this.getAudioContext();
    await Promise.all(
      Object.entries(manifest.sounds).map(async ([key, entry]) => {
        try {
          const response = await fetch(entry.url);
          const arrayBuffer = await response.arrayBuffer();
          const decoded = await context.decodeAudioData(arrayBuffer);
          this.audioBuffers.set(key, decoded);
        } catch (error) {
          console.warn(`[DigitalGarden] Could not load audio "${key}":`, error);
        }
      }),
    );
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }
}
