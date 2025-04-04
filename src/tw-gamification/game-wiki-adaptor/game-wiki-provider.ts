import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { IParseTreeNode, IWidgetEvent, IWidgetInitialiseOptions, Tiddler } from 'tiddlywiki';
import { isGameWidget } from '../types/GameWidgetType';
import { IRealityEventCacheCacheFile } from '../types/RealityEventCacheTypes';
import { BasicRealityEventTypes } from '../types/RealityEventTypes';

declare global {
  interface Window {
    /** Exposed method for wasm based game to save data. */
    twGamificationSaveGameData: (data: string) => void;
  }
}

class GameWikiProvider extends Widget {
  constructor(parseTreeNode: IParseTreeNode, options?: IWidgetInitialiseOptions) {
    super(parseTreeNode, options);
    this.addEventListener('pop-reality-events', this.popEventsAndSendToGameWidget.bind(this));
    window.twGamificationSaveGameData = this.saveGameData.bind(this);
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
    // if `eventTypes` is undefined, do nothing, otherwise this will use as a filter. Game developer must declare the event types they want to receive. So when a new type is added, there won't be reward lost when a developer don't handle the new event.
    const eventTypes = event.eventTypes as BasicRealityEventTypes[] | undefined;
    if (eventTypes === undefined) {
      return false;
    }
    const gamificationEventTiddlerTitles = $tw.wiki.getTiddlersWithTag('$:/Tags/Gamification/RealityEventCache');
    const gamificationEventsJSONs = gamificationEventTiddlerTitles
      .map(title => $tw.wiki.getTiddler(title))
      .filter((tiddler): tiddler is Tiddler => tiddler !== undefined)
      .map(tiddler => {
        try {
          return { fields: tiddler.fields, list: JSON.parse(tiddler.fields.text) as IRealityEventCacheCacheFile };
        } catch {
          return { fields: tiddler.fields, list: [] as IRealityEventCacheCacheFile };
        }
      });
    const gamificationEventsJSONToUse = gamificationEventsJSONs.flatMap(({ list }) => list).filter(item => {
      return eventTypes.includes(item?.event?.type ?? BasicRealityEventTypes.SmallReward);
    });
    // send data to the game
    let handledPromise = event.widget.setRealityEvents(gamificationEventsJSONToUse);
    handledPromise = handledPromise instanceof Promise ? handledPromise : Promise.resolve(handledPromise);
    void handledPromise.then(handled => {
      if (handled) {
        // Get rid used event from event queue
        const unusedRealityEventsJSONs = gamificationEventsJSONs.map(({ fields, list }) => {
          return { fields, list: list.filter(item => !eventTypes.includes(item?.event?.type ?? BasicRealityEventTypes.SmallReward)) };
        });
        unusedRealityEventsJSONs.forEach(({ fields, list }) => {
          // also in `src/tw-gamification/reality-event-cache/handle-reality-event-cache.ts`
          const newText = JSON.stringify(list);
          if (newText === fields.text) return;
          $tw.wiki.addTiddler({ ...fields, text: newText });
        });
      }
    });
    return true;
  }

  private saveGameData(_data: string) {
    // Handle the serialized data
    // console.log('saveGameData Received game data:', data);
  }
}

declare let exports: {
  GameWikiProvider: typeof GameWikiProvider;
};
exports.GameWikiProvider = GameWikiProvider;
