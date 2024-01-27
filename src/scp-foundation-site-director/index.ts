import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { IChangedTiddlers } from 'tiddlywiki';
import init from './game/wasm/game';
import './index.css';

class ScpFoundationSiteDirectorGameWidget extends Widget {
  refresh(_changedTiddlers: IChangedTiddlers) {
    return false;
  }

  render(parent: Element, nextSibling: Element) {
    this.parentDomNode = parent;
    this.execute();
    const containerElement = $tw.utils.domMaker('div', {
      text: 'Loading game...',
    });
    nextSibling === null ? parent.append(containerElement) : nextSibling.before(containerElement);
    this.domNodes.push(containerElement);
    // wasm is bundled into tw using `game/tiddlywiki.files`
    void init('$:/plugins/linonetwo/scp-foundation-site-director/game_bg.wasm');
  }
}

declare let exports: {
  ScpFoundationSiteDirectorGameWidget: typeof ScpFoundationSiteDirectorGameWidget;
};
exports.ScpFoundationSiteDirectorGameWidget = ScpFoundationSiteDirectorGameWidget;
