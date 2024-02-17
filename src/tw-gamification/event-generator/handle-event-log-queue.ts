/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable unicorn/no-array-callback-reference */
/* eslint-disable array-callback-return */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */

import { IAddGamificationEventParameterObject, IGameEventLogCacheFile, IGameEventLogCacheItem } from './GamificationEventLogTypes';
import { IGeneratorOnDuplicateStrategy } from './GamificationEventTypes';
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
exports.after = ['story'];
exports.synchronous = true;

exports.startup = function twGamificationHandleEventLogQueueStartupModule() {
  const logQueueTitle = getLogQueueTitle();
  // Listen for widget messages to create one or many IGameEventLogCacheItem, append to the log cache file.
  $tw.rootWidget.addEventListener('tm-add-gamification-event', function onAddGamificationEvent(event) {
    const parameterObject = (event.paramObject ?? {}) as unknown as IAddGamificationEventParameterObject;
    const logCacheFileContent = $tw.wiki.getTiddlerText(logQueueTitle);
    const logCache: IGameEventLogCacheFile = logCacheFileContent ? $tw.utils.parseJSONSafe(logCacheFileContent) : [];
    const logCacheLength = logCache.length;
    if ('events' in parameterObject) {
      // Add many events at once
      const events = parameterObject.events;
      events.forEach(({ event, tiddlerTitle, generator, 'on-duplicate': onDuplicate }) => {
        checkAndPushAnItemToLogCacheFile({ tiddlerTitle, event, generator }, { onDuplicate }, { logCache });
      });
      logCache.push(...events);
    } else {
      const { tiddlerTitle, 'on-duplicate': onDuplicate, generator, ...event } = parameterObject;
      checkAndPushAnItemToLogCacheFile({ tiddlerTitle, event, generator: generator || 'ActionWidget' }, { onDuplicate }, { logCache });
    }
    // if no change, then no need to update the tiddler. Note that update tiddler may trigger 'change' event, which may cause infinite loop if not handle properly.
    if (logCache.length === logCacheLength) return;
    $tw.wiki.addTiddler({ title: logQueueTitle, text: JSON.stringify(logCache) });
  });
};

function checkAndPushAnItemToLogCacheFile(
  newEventLog: IGameEventLogCacheItem,
  configs: { onDuplicate?: IGeneratorOnDuplicateStrategy },
  sources: { logCache: IGameEventLogCacheFile },
) {
  // TODO: also check the archive log (the events already used by the game, which clean up in a few days.)
  const logCache = sources.logCache;
  const isSameEvent = (item: IGameEventLogCacheItem) => item.tiddlerTitle === newEventLog.tiddlerTitle && item.event.event === newEventLog.event.event;
  // TODO: add signature generation
  switch (configs.onDuplicate) {
    case IGeneratorOnDuplicateStrategy.ignore: {
      if (logCache.some(isSameEvent)) return;
      logCache.push(newEventLog);
      break;
    }
    case IGeneratorOnDuplicateStrategy.append: {
      logCache.push(newEventLog);
      return;
    }
    // default to overwrite
    case undefined:
    case IGeneratorOnDuplicateStrategy.overwrite: {
      const index = logCache.findIndex(isSameEvent);
      if (index !== -1) logCache[index] = newEventLog;
      break;
    }
  }
}
