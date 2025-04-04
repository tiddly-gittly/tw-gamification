import { Definitions } from './types/GameData';

export function preload(this: Phaser.Scene) {
  const characterImagesFolder = '$:/plugins/linonetwo/project-babel-library/images/characters/';
  const characterImageTiddlerTitles = $tw.wiki.filterTiddlers(`[all[shadows]prefix[${characterImagesFolder}]]`);
  characterImageTiddlerTitles.forEach((tiddlerTitle) => {
    const tiddler = $tw.wiki.getTiddler(tiddlerTitle);
    if (tiddler?.fields.text) {
      const base64Image = `data:${tiddler.fields.type};base64,${tiddler.fields.text}`;
      const imageName = tiddlerTitle.replace(characterImagesFolder, '');
      this.load.spritesheet(imageName, base64Image, {
        frameWidth: 43,
        frameHeight: 43,
      });
    }
  });

  const objectsImageBase64 = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/project-babel-library/images/objects/texture.png');
  const objectsTextureAtlas = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/project-babel-library/images/objects/texture.json');
  if (objectsImageBase64 && objectsTextureAtlas) {
    this.load.atlas('objects', `data:image/png;base64,${objectsImageBase64}`, JSON.parse(objectsTextureAtlas) as object);
  }
  const furnitureDefinitions = $tw.wiki.getTiddlerData('$:/plugins/linonetwo/project-babel-library/definition/objects/furniture.json');
  // 使用 DataManager 存储数据
  this.registry.set('definitions', {
    furniture: furnitureDefinitions,
  } as Definitions);
}
