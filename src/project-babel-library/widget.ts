import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { Application, Assets, TilingSprite } from '$:/plugins/linonetwo/pixijs/pixi.js';
import { IChangedTiddlers } from 'tiddlywiki';
import './style.css';

class ExampleWidget extends Widget {
  refresh(_changedTiddlers: IChangedTiddlers) {
    return false;
  }

  render(parent: Element, nextSibling: Element) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    const containerElement = $tw.utils.domMaker('p', {
      class: 'project-babel-library-container',
    });
    parent.insertBefore(containerElement, nextSibling);
    this.domNodes.push(containerElement);

    // Asynchronous IIFE
    void (async () => {
      // Create a PixiJS application.
      const app = new Application();

      // Intialize the application.
      await app.init({ background: '#1099bb', resizeTo: containerElement });

      // Then adding the application's canvas to the DOM body.
      containerElement.append(app.canvas);

      // // Load the bunny texture.
      // const texture = await Assets.load('https://pixijs.com/assets/bunny.png');

      // // Create a new Sprite from an image path
      // const bunny = new Sprite(texture);

      // // Add to stage
      // app.stage.addChild(bunny);

      // // Center the sprite's anchor point
      // bunny.anchor.set(0.5);

      // // Move the sprite to the center of the screen
      // bunny.x = app.screen.width / 2;
      // bunny.y = app.screen.height / 2;
      // Load the tile texture
      const texture = await Assets.load('https://pixijs.com/assets/p2.jpeg');

      /* Create a tiling sprite and add it to the stage...
     * requires a texture, a width and a height
     * in WebGL the image size should preferably be a power of two
     */
      const tilingSprite = new TilingSprite({
        texture,
        width: app.screen.width,
        height: app.screen.height,
      });

      app.stage.addChild(tilingSprite);

      let count = 0;

      // Animate the tiling sprite
      app.ticker.add(() => {
        count += 0.005;

        tilingSprite.tileScale.x = 2 + Math.sin(count);
        tilingSprite.tileScale.y = 2 + Math.cos(count);

        tilingSprite.tilePosition.x += 1;
        tilingSprite.tilePosition.y += 1;
      });
    })();
  }
}

declare let exports: {
  ['project-babel-library']: typeof ExampleWidget;
};
exports['project-babel-library'] = ExampleWidget;
