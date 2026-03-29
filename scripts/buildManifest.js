const fs = require('fs');
const path = require('path');

const imagesDir = 'src/digital-garden/assets/raw-images';
const audioDir = 'src/digital-garden/assets/raw-audio';
const manifestDir = 'src/digital-garden/assets/manifest';

const audioMimeByExt = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
};

function fileToBase64(filePath, mimeType) {
  const data = fs.readFileSync(filePath);
  return `data:${mimeType};base64,${data.toString('base64')}`;
}

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function listFilesByExtensions(dirPath, extensions) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .filter((fileName) => extensions.includes(path.extname(fileName).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
}

ensureDirectory(manifestDir);

const atlases = listFilesByExtensions(imagesDir, ['.png']).map((fileName) => {
  const key = path.basename(fileName, '.png');
  return {
    key,
    url: fileToBase64(path.join(imagesDir, fileName), 'image/png'),
  };
});

const atlasManifest = { atlases };
fs.writeFileSync(
  path.join(manifestDir, 'atlas-manifest.json'),
  JSON.stringify(atlasManifest, null, 2),
);

const sounds = {};
for (const fileName of listFilesByExtensions(audioDir, Object.keys(audioMimeByExt))) {
  const ext = path.extname(fileName).toLowerCase();
  const key = path.basename(fileName, ext);
  sounds[key] = {
    url: fileToBase64(path.join(audioDir, fileName), audioMimeByExt[ext]),
  };
}

const audioManifest = { sounds };
fs.writeFileSync(
  path.join(manifestDir, 'audio-manifest.json'),
  JSON.stringify(audioManifest, null, 2),
);

console.log(`Generated Digital Garden manifests: ${atlases.length} image(s), ${Object.keys(sounds).length} sound(s)`);
