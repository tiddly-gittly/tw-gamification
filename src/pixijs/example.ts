import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { Application, Assets, Sprite } from '$:/plugins/linonetwo/pixijs/pixi.js';
import { IChangedTiddlers } from 'tiddlywiki';

class ExampleWidget extends Widget {
  refresh(_changedTiddlers: IChangedTiddlers) {
    return false;
  }

  render(parent: Element, nextSibling: Element) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    const containerElement = $tw.utils.domMaker('p', {
      class: 'tc-example-widget',
      text: 'This is a widget!',
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

      // Load the bunny texture.
      const texture = await Assets.load('https://pixijs.com/assets/bunny.png');

      // Create a new Sprite from an image path
      const bunny = new Sprite(texture);

      // Add to stage
      app.stage.addChild(bunny);

      // Center the sprite's anchor point
      bunny.anchor.set(0.5);

      // Move the sprite to the center of the screen
      bunny.x = app.screen.width / 2;
      bunny.y = app.screen.height / 2;
    })();
  }
}

declare let exports: {
  ['pixijs-example']: typeof ExampleWidget;
};
exports['pixijs-example'] = ExampleWidget;
