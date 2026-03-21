const fs = require('fs');
const path = require('path');

function fileToBase64(file, mimeType) {
  const data = fs.readFileSync(file);
  return `data:${mimeType};base64,${data.toString('base64')}`;
}

const imagesDir = 'src/digital-garden/assets/raw-images';
const jsondir = 'src/digital-garden/assets/manifest';
const atlases = [];
const imageFiles = fs.readdirSync(imagesDir).filter(f => f.endsWith('.png'));
for (const f of imageFiles) {
  const key = f.replace('.png', '');
  atlases.push({
    key,
    url: fileToBase64(path.join(imagesDir, f), 'image/png')
  });
}

const atlasManifest = { atlases };
fs.writeFileSync(path.join(jsondir, 'atlas-manifest.json'), JSON.stringify(atlasManifest, null, 2));

const audioDir = 'src/digital-garden/assets/raw-audio';
const sounds = {};
const audioFiles = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3'));
for (const f of audioFiles) {
  const key = f.replace('.mp3', '');
  sounds[key] = {
    url: fileToBase64(path.join(audioDir, f), 'audio/mpeg')
  };
}

const audioManifest = { sounds };
fs.writeFileSync(path.join(jsondir, 'audio-manifest.json'), JSON.stringify(audioManifest, null, 2));

console.log('Manifests generated');
