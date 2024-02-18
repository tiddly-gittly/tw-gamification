/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable unicorn/no-array-callback-reference */
/* eslint-disable array-callback-return */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import pick from 'lodash/pick';
import {
  IAddGamificationEventParameterObject,
  IAddGamificationEventParameterObjectFromActionWidget,
  IAddGamificationEventParameterObjectFromJSEventItem,
  IGameEventLogCacheFile,
  IGameEventLogCacheItem,
} from './GamificationEventLogTypes';
import { IDuplicationStrategy, IFindDuplicateParameters, IGeneratorFindDuplicateStrategy, IGeneratorOnDuplicateStrategy } from './GamificationEventTypes';
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
      events.forEach((eventItem) => {
        const { tiddlerTitle, event, generator } = eventItem;
        checkAndPushAnItemToLogCacheFile({ tiddlerTitle, event, generator }, getCheckConfig(eventItem), { logCache });
      });
      logCache.push(...events);
    } else {
      checkAndPushAnItemToLogCacheFile(getEventFromParameterObject(parameterObject), getCheckConfig(parameterObject), { logCache });
    }
    // if no change, then no need to update the tiddler. Note that update tiddler may trigger 'change' event, which may cause infinite loop if not handle properly.
    if (logCache.length === logCacheLength) return;
    $tw.wiki.addTiddler({ title: logQueueTitle, text: JSON.stringify(logCache) });
  });
};

function getCheckConfig(
  input: IAddGamificationEventParameterObjectFromActionWidget | IAddGamificationEventParameterObjectFromJSEventItem,
): IDuplicationStrategy & IFindDuplicateParameters {
  return pick(input, [
    'on-duplicate',
    'find-duplicate',
    'debounce-duration',
    'debounce-generator-title',
    'debounce-tiddler-condition',
    'debounce-tiddler-title',
    'find-duplicate-filter',
  ]);
}

function getEventFromParameterObject(
  parameterObject: IAddGamificationEventParameterObjectFromActionWidget,
): IGameEventLogCacheItem {
  const event = pick(parameterObject, ['amount', 'event', 'message', 'timestamp']);
  return {
    event,
    generator: parameterObject.generator || 'ActionWidget',
    tiddlerTitle: parameterObject.tiddlerTitle,
  };
}

export function checkAndPushAnItemToLogCacheFile(
  newEventLog: IGameEventLogCacheItem,
  configs: IDuplicationStrategy & IFindDuplicateParameters,
  sources: { logCache: IGameEventLogCacheFile },
) {
  // TODO: also check the archive log (the events already used by the game, which clean up in a few days.)
  const logCache = sources.logCache;
  let sameEventIndexInLogCache = -1;
  let hasDuplicate = false;
  switch (configs['find-duplicate']) {
    case undefined: {
      // default to ignore the duplicate
      break;
    }
    case IGeneratorFindDuplicateStrategy.debounce: {
      const debounceTime = configs['debounce-duration'] || 1000;
      const now = Date.now();
      const checkTiddlerTitle = configs['debounce-tiddler-title'] === 'yes';
      const checkGeneratorTitle = configs['debounce-generator-title'] === 'yes';
      sameEventIndexInLogCache = logCache.findIndex((log) => {
        if (checkTiddlerTitle && log.tiddlerTitle !== newEventLog.tiddlerTitle) return false;
        if (checkGeneratorTitle && log.generator !== newEventLog.generator) return false;
        // TODO: handle the variable pass to the filter
        // if (configs['find-duplicate-filter']) {
        //   const filter = $tw.wiki.compileFilter(configs['find-duplicate-filter']);
        //   if (filter) {
        //     const result = filter.call($tw.wiki, newEventLog, log);
        //     if (result === 'yes') return true;
        //   }
        // }
        return now - log.event.timestamp < debounceTime;
      });
      if (sameEventIndexInLogCache > -1) {
        hasDuplicate = true;
      }
      break;
    }
  }

  // TODO: add signature generation
  switch (configs['on-duplicate']) {
    // default to ignore
    case undefined:
    case IGeneratorOnDuplicateStrategy.ignore: {
      if (hasDuplicate) return;
      logCache.push(newEventLog);
      break;
    }
    case IGeneratorOnDuplicateStrategy.append: {
      logCache.push(newEventLog);
      break;
    }
    case IGeneratorOnDuplicateStrategy.overwrite: {
      if (sameEventIndexInLogCache !== -1) logCache[sameEventIndexInLogCache] = newEventLog;
      break;
    }
  }
}
