/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable unicorn/no-array-callback-reference */
/* eslint-disable array-callback-return */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import pick from 'lodash/pick';
import { IDuplicationStrategy, IFindDuplicateParameters, IGeneratorFindDuplicateStrategy, IGeneratorOnDuplicateStrategy } from '../reality-event-generator/DuplicationHandlerTypes';
import { getLogQueueTitle } from './getLogQueueTitle';
import {
  IAddRealityEventParameterObject,
  IAddRealityEventParameterObjectFromActionWidget,
  IAddRealityEventParameterObjectFromJSEventItem,
  IRealityEventCacheCacheFile,
  IRealityEventCacheCacheItem,
} from './RealityEventCacheTypes';

// eslint-disable-next-line no-var
declare var exports: {
  after: string[];
  name: string;
  platforms: string[];
  startup: () => void;
  synchronous: boolean;
};
exports.name = 'tw-gamification-handle-reality-event-cache';
/**
 * This creates event handlers, should work on both side to receive event from both buttons and event generators.
 */
exports.platforms = ['browser', 'node'];
exports.after = ['story'];
exports.synchronous = true;

exports.startup = function twGamificationHandleEventCacheQueueStartupModule() {
  const logQueueTitle = getLogQueueTitle();
  // Listen for widget messages to create one or many IRealityEventCacheCacheItem, append to the log cache file.
  $tw.rootWidget.addEventListener('tm-add-reality-event', function onAddRealityEvent(event) {
    const parameterObject = (event.paramObject ?? {}) as unknown as IAddRealityEventParameterObject;
    const logCacheFile = $tw.wiki.getTiddler(logQueueTitle);
    const logCacheFileContent = logCacheFile?.fields.text;
    const logCache: IRealityEventCacheCacheFile = logCacheFileContent ? $tw.utils.parseJSONSafe(logCacheFileContent) : [];
    let hasModification = false;
    if ('events' in parameterObject) {
      // Add many events at once
      const events = parameterObject.events;
      events.forEach((eventItem) => {
        hasModification = checkAndPushAnItemToLogCacheFile(eventItem, getCheckConfig(eventItem), { logCache });
      });
    } else {
      hasModification = checkAndPushAnItemToLogCacheFile(getEventFromParameterObject(parameterObject), getCheckConfig(parameterObject), { logCache });
    }
    // if no change, then no need to update the tiddler. Note that update tiddler may trigger 'change' event, which may cause infinite loop if not handle properly.
    if (!hasModification) return false;
    const newText = JSON.stringify(logCache);
    if (newText === logCacheFileContent) return false;
    // added here, deleted in `src/tw-gamification/game-wiki-adaptor/game-wiki-provider.ts`
    $tw.wiki.addTiddler({ ...logCacheFile?.fields, text: newText });
    return false;
  });
};

function getCheckConfig(
  input: IAddRealityEventParameterObjectFromActionWidget | IAddRealityEventParameterObjectFromJSEventItem,
): IDuplicationStrategy & IFindDuplicateParameters & Required<Pick<IFindDuplicateParameters, 'debounce-duration'>> {
  const configs = pick(input.configs, [
    'on-duplicate',
    'find-duplicate',
    'debounce-duration',
    'debounce-generator-title',
    'debounce-tiddler-condition',
    'debounce-tiddler-title',
    'find-duplicate-filter',
  ]);
  configs['debounce-tiddler-title'] = configs['debounce-tiddler-title'] || 'yes';
  configs['debounce-generator-title'] = configs['debounce-generator-title'] || 'yes';
  configs['debounce-tiddler-condition'] = configs['debounce-tiddler-condition'] || 'and';
  return {
    ...configs,
    'debounce-duration': (configs['debounce-duration'] && Number.isFinite(Number(configs['debounce-duration']))) ? 1000 * Number(configs['debounce-duration']) : 1000 * 60,
  };
}

function getEventFromParameterObject(
  parameterObject: IAddRealityEventParameterObjectFromActionWidget,
): IRealityEventCacheCacheItem {
  const event = pick(parameterObject, ['amount', 'type', 'message', 'timestamp', 'item']);
  return {
    event,
    meta: {
      generator: parameterObject.generator || 'ActionWidget',
      tiddlerTitle: parameterObject.tiddlerTitle,
    },
  };
}

function checkAndPushAnItemToLogCacheFile(
  newEventCache: IRealityEventCacheCacheItem,
  configs: ReturnType<typeof getCheckConfig>,
  sources: { logCache: IRealityEventCacheCacheFile },
): boolean {
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
      const debounceTime = configs['debounce-duration'];
      const now = Date.now();
      const checkTiddlerTitle = configs['debounce-tiddler-title'] === 'yes';
      const checkGeneratorTitle = configs['debounce-generator-title'] === 'yes';
      const conditionIsAnd = configs['debounce-tiddler-condition'] === 'and';
      // sort make newest event at the top, to be easier to check for duplicate
      sameEventIndexInLogCache = logCache.sort((a, b) => b.event.timestamp - a.event.timestamp).findIndex((log) => {
        // TODO: handle the variable pass to the filter
        // if (configs['find-duplicate-filter']) {
        //   const filter = $tw.wiki.compileFilter(configs['find-duplicate-filter']);
        //   if (filter) {
        //     const result = filter.call($tw.wiki, newEventCache, log);
        //     if (result === 'yes') return true;
        //   }
        // }
        const isDebounced = (now - log.event.timestamp) < debounceTime;
        const sameTiddlerTitle = checkTiddlerTitle && log.meta.tiddlerTitle === newEventCache.meta.tiddlerTitle;
        const sameGeneratorTitle = checkGeneratorTitle && log.meta.generator === newEventCache.meta.generator;
        if (checkTiddlerTitle && checkGeneratorTitle) {
          if (conditionIsAnd) {
            return sameTiddlerTitle && sameGeneratorTitle && isDebounced;
          } else {
            return (sameTiddlerTitle || sameGeneratorTitle) && isDebounced;
          }
        } else if (checkTiddlerTitle) {
          return sameTiddlerTitle && isDebounced;
        } else if (checkGeneratorTitle) {
          return sameGeneratorTitle && isDebounced;
        }
      });
      if (sameEventIndexInLogCache > -1) {
        hasDuplicate = true;
      }
      break;
    }
  }

  let hasModification = false;
  // TODO: add signature generation
  switch (configs['on-duplicate']) {
    // default to ignore
    case undefined:
    case IGeneratorOnDuplicateStrategy.ignore: {
      if (hasDuplicate) break;
      logCache.push(newEventCache);
      hasModification = true;
      break;
    }
    case IGeneratorOnDuplicateStrategy.append: {
      logCache.push(newEventCache);
      hasModification = true;
      break;
    }
    case IGeneratorOnDuplicateStrategy.overwrite: {
      if (sameEventIndexInLogCache !== -1) {
        logCache[sameEventIndexInLogCache] = newEventCache;
        hasModification = true;
      }
      break;
    }
  }
  return hasModification;
}