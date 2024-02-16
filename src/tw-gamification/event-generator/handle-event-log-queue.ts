/* eslint-disable unicorn/no-array-callback-reference */
/* eslint-disable array-callback-return */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */

import { IAddGamificationEventParameterObject, IGameEventLogCacheFile, IGameEventLogCacheItem } from './GamificationEventLogTypes';
import { IGamificationEvent, IGeneratorDuplicateStrategy } from './GamificationEventTypes';
import { getLogQueueTitle } from './getLogQueueTitle';

// eslint-disable-next-line no-var
declare var exports: {
  after: string[];
  name: string;
  platforms: string[];
  startup: () => void;
  synchronous: boolean;
};
exports.name = 'tw-gamification-handle-event-log-queue';
/**
 * This creates event handlers, should work on both side to receive event from both buttons and event generators.
 */
exports.platforms = ['browser', 'node'];
exports.after = ['startup'];
exports.synchronous = true;

const logQueueTitle = getLogQueueTitle();
exports.startup = function twGamificationHandleEventLogQueueStartupModule() {
  // Listen for widget messages to create one or many IGameEventLogCacheItem, append to the log cache file.
  $tw.rootWidget.addEventListener('tm-add-gamification-event', function(event) {
    const parameterObject = (event.paramObject ?? {}) as unknown as IAddGamificationEventParameterObject;
    const logCacheFileContent = $tw.wiki.getTiddlerText(logQueueTitle);
    const logCache: IGameEventLogCacheFile = logCacheFileContent ? $tw.utils.parseJSONSafe(logCacheFileContent) : [];
    if ('events' in parameterObject) {
      // Add many events at once
      const events = parameterObject.events;
      events.forEach(({ event, tiddlerTitle, 'on-duplicate': onDuplicate }) => {
        checkAndPushAnItemToLogCacheFile(tiddlerTitle, event, { onDuplicate }, { logCache });
      });
      logCache.push(...events);
    } else {
      const { tiddlerTitle, 'on-duplicate': onDuplicate, ...event } = parameterObject;
      checkAndPushAnItemToLogCacheFile(tiddlerTitle, event, { onDuplicate }, { logCache });
    }
    $tw.wiki.addTiddler({ title: logQueueTitle, text: JSON.stringify(logCache) });
  });
};

function checkAndPushAnItemToLogCacheFile(
  tiddlerTitle: string,
  event: IGamificationEvent,
  configs: { onDuplicate?: IGeneratorDuplicateStrategy },
  sources: { logCache: IGameEventLogCacheFile },
) {
  // TODO: also check the archive log (the events already used by the game, which clean up in a few days.)
  const logCache = sources.logCache;
  const isSameEvent = (item: IGameEventLogCacheItem) => item.tiddlerTitle === tiddlerTitle && item.event.type === event.type;
  // TODO: add signature generation
  switch (configs.onDuplicate) {
    case IGeneratorDuplicateStrategy.ignore: {
      if (logCache.some(isSameEvent)) return;
      logCache.push({ event, tiddlerTitle });
      break;
    }
    case IGeneratorDuplicateStrategy.append: {
      logCache.push({ event, tiddlerTitle });
      return;
    }
    case undefined:
    case IGeneratorDuplicateStrategy.overwrite: {
      const index = logCache.findIndex(isSameEvent);
      if (index !== -1) logCache[index] = { event, tiddlerTitle };
      break;
    }
  }
}
