#!/usr/bin/env node
/**
 * build-atlas.mjs — 将 src/digital-garden/assets/raw/ 中的源图片打包成
 * PixiJS 可加载的 atlas (.json + .png)。
 *
 * 使用方法:
 *   node scripts/build-atlas.mjs
 *   # 或（需安装 zx）:
 *   zx scripts/build-atlas.mjs
 *
 * 依赖工具（首次运行前执行）:
 *   pnpm add -D @pixi/sprite-packer sharp
 *
 * 输出:
 *   src/digital-garden/assets/atlas/garden-atlas.json
 *   src/digital-garden/assets/atlas/garden-atlas.png
 *
 * 命名约定（raw/ 子目录 → frame 名称前缀）:
 *   raw/ground/grass-01.png   → ground-grass-01
 *   raw/building/bookshelf.png → building-bookshelf
 *   raw/character/lord.png     → character-lord
 *   raw/ui/coin-copper.png     → ui-coin-copper
 *
 * PLAN Phase 6 — assets pipeline
 */

import { createRequire } from 'module';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, basename, extname, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const require    = createRequire(import.meta.url);

// ─── Paths ───────────────────────────────────────────────────────────────────

const REPO_ROOT    = join(__dirname, '..');
const RAW_DIR      = join(REPO_ROOT, 'src/digital-garden/assets/raw');
const OUTPUT_DIR   = join(REPO_ROOT, 'src/digital-garden/assets/atlas');
const ATLAS_JSON   = join(OUTPUT_DIR, 'garden-atlas.json');
const ATLAS_PNG    = join(OUTPUT_DIR, 'garden-atlas.png');
const MANIFEST     = join(REPO_ROOT, 'src/digital-garden/assets/atlas-manifest.json');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * Recursively collect all .png / .webp images under a directory.
 * Returns { frameName, filePath }[] where frameName follows the naming convention.
 */
function collectImages(rootDir) {
  const results = [];
  if (!existsSync(rootDir)) return results;

  function walk(dir, prefix) {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, `${prefix}-${entry.name}`);
      } else if (/\.(png|webp)$/i.test(entry.name)) {
        const stem = basename(entry.name, extname(entry.name));
        const frameName = `${prefix}-${stem}`.replace(/^-/, '');
        results.push({ frameName, filePath: fullPath });
      }
    }
  }

  // Each top-level directory becomes a prefix
  const topEntries = readdirSync(rootDir, { withFileTypes: true });
  for (const entry of topEntries) {
    if (entry.isDirectory()) {
      walk(join(rootDir, entry.name), entry.name);
    }
  }

  return results;
}

// ─── Atlas packing ───────────────────────────────────────────────────────────

async function packWithSharp(images) {
  // Dynamic import — sharp is an optional dev dependency
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error(
      '\n  ✗ sharp is not installed. Run:  pnpm add -D sharp\n',
    );
    process.exit(1);
  }

  const MAX_SIZE = 2048;
  const PADDING  = 2;

  // Load all images and their natural dimensions
  const loaded = await Promise.all(
    images.map(async ({ frameName, filePath }) => {
      const meta   = await sharp(filePath).metadata();
      const buffer = await sharp(filePath).ensureAlpha().raw().toBuffer();
      return { frameName, filePath, width: meta.width, height: meta.height, buffer };
    }),
  );

  // Simple shelf-strip bin packing (good enough for small atlases)
  let shelfX = 0;
  let shelfY = 0;
  let shelfHeight = 0;
  const placements = [];

  for (const img of loaded) {
    const w = img.width  + PADDING * 2;
    const h = img.height + PADDING * 2;

    if (shelfX + w > MAX_SIZE) {
      shelfX      = 0;
      shelfY     += shelfHeight;
      shelfHeight = 0;
    }

    placements.push({ ...img, atlasX: shelfX + PADDING, atlasY: shelfY + PADDING });
    shelfX  += w;
    shelfHeight = Math.max(shelfHeight, h);
  }

  const atlasH = shelfY + shelfHeight;
  if (atlasH > MAX_SIZE) {
    console.warn(`  ⚠ Atlas height ${atlasH}px exceeds ${MAX_SIZE}px — consider splitting into multiple atlases.`);
  }

  // Compose the final PNG
  const atlasBuffer = Buffer.alloc(MAX_SIZE * atlasH * 4, 0);

  for (const p of placements) {
    for (let row = 0; row < p.height; row++) {
      const srcOffset  = row * p.width * 4;
      const dstOffset  = ((p.atlasY + row) * MAX_SIZE + p.atlasX) * 4;
      p.buffer.copy(atlasBuffer, dstOffset, srcOffset, srcOffset + p.width * 4);
    }
  }

  ensureDir(OUTPUT_DIR);

  await sharp(atlasBuffer, { raw: { width: MAX_SIZE, height: atlasH, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(ATLAS_PNG);

  // Build PixiJS-compatible JSON descriptor
  const frames = {};
  for (const p of placements) {
    frames[p.frameName] = {
      frame:       { x: p.atlasX, y: p.atlasY, w: p.width, h: p.height },
      rotated:     false,
      trimmed:     false,
      spriteSourceSize: { x: 0, y: 0, w: p.width, h: p.height },
      sourceSize:  { w: p.width, h: p.height },
    };
  }

  const atlasJson = {
    frames,
    meta: {
      app:     'build-atlas.mjs',
      version: '1.0',
      image:   'garden-atlas.png',
      format:  'RGBA8888',
      size:    { w: MAX_SIZE, h: atlasH },
      scale:   '1',
    },
  };

  writeFileSync(ATLAS_JSON, JSON.stringify(atlasJson, null, 2), 'utf8');

  return placements.length;
}

// ─── Manifest ────────────────────────────────────────────────────────────────

function writeManifest(atlasJsonPath) {
  const relPath = relative(
    join(REPO_ROOT, 'src/digital-garden/assets'),
    atlasJsonPath,
  );
  const manifest = {
    atlases: [
      {
        id:   'garden',
        path: relPath,
      },
    ],
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('\n🌿 Digital Garden — Atlas Builder\n');

  const images = collectImages(RAW_DIR);

  if (images.length === 0) {
    console.log(`  No source images found in ${RAW_DIR}`);
    console.log('  Place .png / .webp files under the following subdirectories:\n');
    console.log('    raw/ground/     → ground tile sprites');
    console.log('    raw/building/   → building / decoration sprites');
    console.log('    raw/character/  → lord, resident sprites');
    console.log('    raw/ui/         → coin, icon sprites');
    console.log('\n  Then run:  node scripts/build-atlas.mjs\n');
    process.exit(0);
  }

  console.log(`  Found ${images.length} source image(s):`);
  for (const img of images) {
    console.log(`    ${img.frameName}  ←  ${relative(REPO_ROOT, img.filePath)}`);
  }

  console.log('\n  Packing…');
  const count = await packWithSharp(images);
  writeManifest(ATLAS_JSON);

  console.log(`\n  ✓ Packed ${count} frame(s) → ${relative(REPO_ROOT, ATLAS_PNG)}`);
  console.log(`  ✓ Descriptor  → ${relative(REPO_ROOT, ATLAS_JSON)}`);
  console.log(`  ✓ Manifest    → ${relative(REPO_ROOT, MANIFEST)}`);
  console.log('\n  Commit atlas files via Git LFS (see .gitattributes).\n');
})();
