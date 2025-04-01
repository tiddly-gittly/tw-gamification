import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { IChangedTiddlers } from 'tiddlywiki';
import './style.css';

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

    const width = this.getAttribute('width') || 300;
    const height = this.getAttribute('height') || 300;
    if (!$tw.browser) {
      // If not in a browser, return early
      return;
    }

    // Asynchronous IIFE
    void (async () => {
      // Wait for Phaser to be loaded to window.Phaser
      await new Promise(resolve => setTimeout(resolve, 10));
      // async import preload and create to prevent `ReferenceError: Phaser is not defined` caused by `class XXX extends Phaser.GameObjects.Container`
      const { preload } = await import('./game/preload');
      const { create } = await import('./game/create');

      const config = {
        type: Phaser.AUTO,
        width,
        height,
        zoom: 3,
        pixelArt: true, // Force the game to scale images up crisply
        parent: containerElement,
        scene: {
          preload,
          create,
        },
      } satisfies Phaser.Types.Core.GameConfig;

      const game = new Phaser.Game(config);
      this.game = game;
      setTimeout(() => {
        containerElement.focus();
      }, 100);
    })();
  }
}

declare let exports: {
  ['project-babel-library']: typeof ExampleWidget;
};
exports['project-babel-library'] = ExampleWidget;
