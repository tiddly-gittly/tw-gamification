/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable unicorn/no-array-callback-reference */
/* eslint-disable array-callback-return */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { CamelCasedProperties } from 'type-fest';
import { IAddGamificationEventParameterObject, IGameEventLogCacheFile, IGameEventLogCacheItem } from './GamificationEventLogTypes';
import { IDuplicationStrategy, IGeneratorFindDuplicateStrategy, IGeneratorOnDuplicateStrategy } from './GamificationEventTypes';
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
      events.forEach(({ event, tiddlerTitle, generator, 'on-duplicate': onDuplicate, 'find-duplicate': findDuplicate }) => {
        checkAndPushAnItemToLogCacheFile({ tiddlerTitle, event, generator }, { onDuplicate, findDuplicate }, { logCache });
      });
      logCache.push(...events);
    } else {
      const { tiddlerTitle, 'on-duplicate': onDuplicate, 'find-duplicate': findDuplicate, generator, ...event } = parameterObject;
      checkAndPushAnItemToLogCacheFile({ tiddlerTitle, event, generator: generator || 'ActionWidget' }, { onDuplicate, findDuplicate }, { logCache });
    }
    // if no change, then no need to update the tiddler. Note that update tiddler may trigger 'change' event, which may cause infinite loop if not handle properly.
    if (logCache.length === logCacheLength) return;
    $tw.wiki.addTiddler({ title: logQueueTitle, text: JSON.stringify(logCache) });
  });
};

function checkAndPushAnItemToLogCacheFile(
  newEventLog: IGameEventLogCacheItem,
  configs: CamelCasedProperties<IDuplicationStrategy>,
  sources: { logCache: IGameEventLogCacheFile },
) {
  // TODO: also check the archive log (the events already used by the game, which clean up in a few days.)
  const logCache = sources.logCache;
  let hasDuplicate = false;
  switch (configs.findDuplicate) {
    case undefined: {
      // default to ignore the duplicate
      break;
    }
    case IGeneratorFindDuplicateStrategy.debounce: {
      const debounceTime = 1000;
      const now = Date.now();
      const lastEvent = logCache.at(-1);
      if (lastEvent && lastEvent.tiddlerTitle === newEventLog.tiddlerTitle && lastEvent.event.event === newEventLog.event.event && now - lastEvent.event.timestamp < debounceTime) {
        hasDuplicate = true;
      }
      break;
    }
  }

  const isSameEvent = (item: IGameEventLogCacheItem) => item.tiddlerTitle === newEventLog.tiddlerTitle && item.event.event === newEventLog.event.event;
  // TODO: add signature generation
  switch (configs.onDuplicate) {
    // default to ignore
    case undefined:
    case IGeneratorOnDuplicateStrategy.ignore: {
      if (hasDuplicate) return;
      logCache.push(newEventLog);
      break;
    }
    case IGeneratorOnDuplicateStrategy.append: {
      logCache.push(newEventLog);
    }
      // case IGeneratorOnDuplicateStrategy.overwrite: {
      //   const index = logCache.findIndex(isSameEvent);
      //   if (index !== -1) logCache[index] = newEventLog;
      //   break;
      // }
  }
}
