export function preload(this: Phaser.Scene) {
  this.load.image('tiles', 'https://mikewesthad.github.io/phaser-3-tilemap-blog-posts/post-1/assets/tilesets/super-mario-tiles.png');
  const characterImagesFolder = '$:/plugins/linonetwo/project-babel-library/images/characters/';
  const characterImageTiddlerTitles = $tw.wiki.filterTiddlers(`[all[shadows]prefix[${characterImagesFolder}]]`);
  characterImageTiddlerTitles.forEach((tiddlerTitle) => {
    const tiddler = $tw.wiki.getTiddler(tiddlerTitle);
    if (tiddler?.fields.text) {
      const base64Image = `data:${tiddler.fields.type};base64,${tiddler.fields.text}`;
      const imageName = tiddlerTitle.replace(characterImagesFolder, '');
      this.load.image(imageName, base64Image);
    }
  });
}
