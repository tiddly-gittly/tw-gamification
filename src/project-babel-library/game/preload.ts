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
}
