import { IGeneratorFindDuplicateStrategy, IGeneratorOnDuplicateStrategy } from '../reality-event-generator/deduplication/DuplicationHandlerTypes';
import type { formatDuplicationFields } from '../reality-event-generator/deduplication/formatDuplicationFields';
import { getEventLog } from '../reality-event-generator/reality-event-log/getEventLog';
import { IRealityEventCacheCacheFile, IRealityEventCacheCacheItem } from './RealityEventCacheTypes';

export function checkAndPushAnItemToLogAndCacheFile(
  newEventCache: IRealityEventCacheCacheItem,
  configs: ReturnType<typeof formatDuplicationFields>,
  sources: { eventCache: IRealityEventCacheCacheFile },
): boolean {
  // TODO: also check the archive log (the events already used by the game, which clean up in a few days.)
  const eventCache = sources.eventCache;
  const eventLog = getEventLog(newEventCache.meta.generator);
  let sameEventIndexInEventCache = -1;
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
      // sort make newest event at the top, to be easier to check for duplicate, and we can get index of first duplicate to overwrite
      sameEventIndexInEventCache = eventCache.sort((a, b) => b.event.timestamp - a.event.timestamp).findIndex((log) => {
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
        return false;
      });
      if (sameEventIndexInEventCache > -1) {
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
      eventCache.push(newEventCache);
      hasModification = true;
      break;
    }
    case IGeneratorOnDuplicateStrategy.append: {
      eventCache.push(newEventCache);
      hasModification = true;
      break;
    }
    case IGeneratorOnDuplicateStrategy.overwrite: {
      if (sameEventIndexInEventCache === -1) {
        eventCache.push(newEventCache);
      } else {
        eventCache[sameEventIndexInEventCache] = newEventCache;
      }
      hasModification = true;
      break;
    }
  }
  return hasModification;
}
