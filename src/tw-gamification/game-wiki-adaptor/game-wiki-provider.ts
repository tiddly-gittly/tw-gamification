import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { IChangedTiddlers, IParseTreeNode, IWidgetEvent, IWidgetInitialiseOptions, Tiddler } from 'tiddlywiki';
import { BasicGamificationEventTypes, IGamificationEvent } from '../event-generator/GamificationEventTypes';
import { isGameWidget } from './GameWidgetType';

declare global {
  interface Window {
    /** Exposed method for wasm based game to save data. */
    twGamificationSaveGameData: (data: string) => void;
  }
}

class GameWikiProvider extends Widget {
  constructor(parseTreeNode: IParseTreeNode, options?: IWidgetInitialiseOptions) {
    super(parseTreeNode, options);
    this.addEventListener('pop-gamification-events', this.popEventsAndSendToGameWidget.bind(this));
    window.twGamificationSaveGameData = this.saveGameData.bind(this);
  }

  refresh(changedTiddlers: IChangedTiddlers) {
    // only refresh if `tw-gamification` related state changes. See [[GameWikiProvider]] on wiki.
    if (Object.keys(changedTiddlers).some(title => title.startsWith('$:/state/tw-gamification'))) {
      return this.refreshChildren(changedTiddlers);
    }
    return false;
  }

  render(parent: Element, nextSibling: Element) {
    const containerElement = $tw.utils.domMaker('div', {
      class: 'game-wiki-provider',
    });
    nextSibling === null ? parent.append(containerElement) : nextSibling.before(containerElement);
    this.domNodes.push(containerElement);
    super.render(containerElement, nextSibling);
  }

  /**
   * @returns handled
   */
  private popEventsAndSendToGameWidget(event: IWidgetEvent): boolean {
    if (!isGameWidget(event.widget)) {
      return false;
    }
    // if `eventTypes` is undefined, do nothing, otherwise this will use as a filter. Game developer must declare the event types they want to receive.
    const eventTypes = event.eventTypes as BasicGamificationEventTypes[] | undefined;
    if (eventTypes === undefined) {
      return false;
    }
    const gamificationEventTiddlerTitles = $tw.wiki.getTiddlersWithTag('$:/tags/tw-gamification/GamificationEvent');
    const gamificationEventsJSONs = gamificationEventTiddlerTitles
      .map(title => $tw.wiki.getTiddler(title))
      .filter((tiddler): tiddler is Tiddler => tiddler !== undefined)
      .map(tiddler => {
        try {
          return { title: tiddler.fields.title, list: JSON.parse(tiddler.fields.text) as IGamificationEvent[] };
        } catch {
          return { title: tiddler.fields.title, list: [] as IGamificationEvent[] };
        }
      });
    const gamificationEventsJSON = gamificationEventsJSONs.flatMap(({ list }) => list).filter(item => eventTypes.includes(item.type ?? BasicGamificationEventTypes.SmallReward));
    // send data to the game
    let handledPromise = event.widget.setGamificationEvents(gamificationEventsJSON);
    handledPromise = handledPromise instanceof Promise ? handledPromise : Promise.resolve(handledPromise);
    void handledPromise.then(handled => {
      if (handled) {
        // Get rid used event from event queue
        const unusedGamificationEventsJSONs = gamificationEventsJSONs.map(({ title, list }) => {
          return { title, list: list.filter(item => !eventTypes.includes(item.type ?? BasicGamificationEventTypes.SmallReward)) };
        });
        unusedGamificationEventsJSONs.forEach(({ title, list }) => {
          $tw.wiki.addTiddler({ title, text: JSON.stringify(list) });
          // TODO: save log archive JSON by generator, so we can easily create statistic chart for each event
        });
      }
    });
    return true;
  }

  private saveGameData(data: string) {
    // Handle the serialized data
    console.log('saveGameData Received game data:', data);
  }
}

declare let exports: {
  GameWikiProvider: typeof GameWikiProvider;
};
exports.GameWikiProvider = GameWikiProvider;
