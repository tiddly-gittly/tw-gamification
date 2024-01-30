import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { IChangedTiddlers, IParseTreeNode, IWidgetEvent, IWidgetInitialiseOptions, Tiddler } from 'tiddlywiki';
import { IGamificationEvent } from '../event-generator/GamificationEventTypes';
import { isGameWidget } from './GameWidgetType';

class GameWikiAdaptor extends Widget {
  constructor(parseTreeNode: IParseTreeNode, options?: IWidgetInitialiseOptions) {
    super(parseTreeNode, options);
    this.addEventListener('pop-gamification-events', this.popEventsAndSendToGameWidget.bind(this));
  }

  refresh(changedTiddlers: IChangedTiddlers) {
    // only refresh if `tw-gamification` related state changes. See [[GameWikiAdaptor]] on wiki.
    if (Object.keys(changedTiddlers).some(title => title.startsWith('$:/state/tw-gamification'))) {
      return this.refreshChildren(changedTiddlers);
    }
    return false;
  }

  render(parent: Element, nextSibling: Element) {
    const containerElement = $tw.utils.domMaker('div', {
      class: 'game-wiki-adaptor',
    });
    nextSibling === null ? parent.append(containerElement) : nextSibling.before(containerElement);
    this.domNodes.push(containerElement);
    super.render(containerElement, nextSibling);
  }

  private popEventsAndSendToGameWidget(event: IWidgetEvent) {
    if (!isGameWidget(event.widget)) {
      return true;
    }
    const gamificationEventTiddlerTitles = $tw.wiki.getTiddlersWithTag('$:/tags/tw-gamification/GamificationEvent');
    const gamificationEventsJSON = gamificationEventTiddlerTitles
      .map(title => $tw.wiki.getTiddler(title))
      .filter((tiddler): tiddler is Tiddler => tiddler !== undefined)
      .flatMap(tiddler => {
        try {
          return JSON.parse(tiddler.fields.text) as IGamificationEvent[];
        } catch {
          return [] as IGamificationEvent[];
        }
      });
    // clean up event queue
    gamificationEventTiddlerTitles.forEach(title => {
      $tw.wiki.deleteTiddler(title);
    });
    // send data to the game
    void event.widget.setGamificationEvents(gamificationEventsJSON);
    return false;
  }
}

declare let exports: {
  GameWikiAdaptor: typeof GameWikiAdaptor;
};
exports.GameWikiAdaptor = GameWikiAdaptor;
