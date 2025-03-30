import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { IChangedTiddlers } from 'tiddlywiki';

class ExampleWidget extends Widget {
  refresh(_changedTiddlers: IChangedTiddlers) {
    return false;
  }

  game: Phaser.Game | null = null;

  render(parent: Element, nextSibling: Element) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    const containerElement = $tw.utils.domMaker('p', {
      class: 'tc-example-widget',
    });
    parent.insertBefore(containerElement, nextSibling);
    this.domNodes.push(containerElement);

    // Asynchronous IIFE
    void (async () => {
      // Wait for Phaser to be loaded to window.Phaser
      await new Promise(resolve => setTimeout(resolve, 10));
      /**
       * Author: Michael Hadley, mikewesthad.com
       * Asset Credits:
       *  - Nintendo Mario Tiles, Educational use only
       */
      const config = {
        type: Phaser.AUTO,
        width: 171,
        height: 160,
        zoom: 3, // Since we're working with 16x16 pixel tiles, let's scale up the canvas by 3x
        pixelArt: true, // Force the game to scale images up crisply
        parent: containerElement,
        scene: {
          preload,
          create,
        },
      };

      const game = new Phaser.Game(config);
      this.game = game;

      function preload(this: Phaser.Scene) {
        this.load.image('tiles', 'https://mikewesthad.github.io/phaser-3-tilemap-blog-posts/post-1/assets/tilesets/super-mario-tiles.png');
      }

      function create(this: Phaser.Scene) {
        // Load a map from a 2D array of tile indices
        const level = [
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 1, 2, 3, 0, 0, 0, 1, 2, 3, 0],
          [0, 5, 6, 7, 0, 0, 0, 5, 6, 7, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 14, 13, 14, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 14, 14, 14, 14, 14, 0, 0, 0, 15],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 15],
          [35, 36, 37, 0, 0, 0, 0, 0, 15, 15, 15],
          [39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39],
        ];

        // When loading from an array, make sure to specify the tileWidth and tileHeight
        const map = this.make.tilemap({ data: level, tileWidth: 16, tileHeight: 16 });
        const tiles = map.addTilesetImage('tiles')!;
        map.createLayer(0, tiles, 0, 0);
      }
    })();
  }
}

declare let exports: {
  ['phaser-example']: typeof ExampleWidget;
};
exports['phaser-example'] = ExampleWidget;
