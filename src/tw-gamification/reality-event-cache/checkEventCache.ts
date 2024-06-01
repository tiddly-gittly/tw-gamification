import type { formatDuplicationFields } from '../reality-event-generator/deduplication/formatDuplicationFields';
import { IRealityEventCacheCacheFile, IRealityEventCacheCacheItem } from '../types/RealityEventCacheTypes';

export function checkEventCacheDebounceDuplication(
  newEventCacheItem: IRealityEventCacheCacheItem,
  eventCache: IRealityEventCacheCacheFile,
  configs: ReturnType<typeof formatDuplicationFields>,
): number {
  const debounceDuration = configs['debounce-duration'];
  const { event, meta } = newEventCacheItem;
  const now = new Date(event.timestamp).getTime();
  const checkTiddlerTitle = configs['debounce-tiddler-title'] === 'yes';
  const checkGeneratorTitle = configs['debounce-generator-title'] === 'yes';
  const conditionIsAnd = configs['debounce-tiddler-condition'] === 'and';
  // sort make newest event at the top, to be easier to check for duplicate, and we can get index of first duplicate to overwrite
  const sameEventIndexInEventCache = eventCache.sort((a, b) => b.event.timestamp - a.event.timestamp).findIndex((log) => {
    // TODO: handle the variable pass to the filter
    // if (configs['find-duplicate-filter']) {
    //   const filter = $tw.wiki.compileFilter(configs['find-duplicate-filter']);
    //   if (filter) {
    //     const result = filter.call($tw.wiki, newEventCache, log);
    //     if (result === 'yes') return true;
    //   }
    // }
    const isDebounced = (now - log.event.timestamp) < debounceDuration;
    const sameTiddlerTitle = checkTiddlerTitle && log.meta?.tiddlerTitle === meta?.tiddlerTitle;
    const sameGeneratorTitle = checkGeneratorTitle && log.meta?.generator === meta?.generator;
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
  return sameEventIndexInEventCache;
}
