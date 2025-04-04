import type { formatDuplicationFields } from '../reality-event-generator/deduplication/formatDuplicationFields';
import { addEventLog } from '../reality-event-generator/reality-event-log/addEventLog';
import { checkEventLogDebounceDuplication } from '../reality-event-generator/reality-event-log/checkEventLog';
import { getEventLog } from '../reality-event-generator/reality-event-log/getEventLog';
import { IGeneratorFindDuplicateStrategy, IGeneratorOnDuplicateStrategy } from '../types/DuplicationHandlerTypes';
import { IRealityEventCacheCacheFile, IRealityEventCacheCacheItem } from '../types/RealityEventCacheTypes';
import { checkEventCacheDebounceDuplication } from './checkEventCache';

function onItemDuplicateAndCanceled(newEventCacheItem: IRealityEventCacheCacheItem) {
  let eventName: string | undefined;
  if (newEventCacheItem.meta?.generator !== undefined) {
    const generator = $tw.wiki.getTiddler(newEventCacheItem.meta?.generator);
    eventName = generator?.fields?.caption as string | undefined;
    if (eventName !== undefined) {
      eventName = $tw.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', eventName);
    }
  }
  $tw.rootWidget.dispatchEvent({
    type: 'tm-notify',
    param: '$:/plugins/linonetwo/tw-gamification/tiddlywiki-ui/notification/on-reality-event-debounced',
    paramObject: { eventName },
  });
}
export function checkAndPushAnItemToLogAndCacheFile(
  newEventCacheItem: IRealityEventCacheCacheItem,
  configs: ReturnType<typeof formatDuplicationFields>,
  sources: { eventCache: IRealityEventCacheCacheFile | undefined } | undefined,
): boolean {
  // TODO: also check the archive log (the events already used by the game, which clean up in a few days.)
  const eventCache = Array.isArray(sources?.eventCache) ? sources.eventCache : [];
  const eventLog = getEventLog(newEventCacheItem.meta?.generator);
  let sameEventIndexInEventCache = -1;
  let hasDuplicate = false;
  switch (configs['find-duplicate']) {
    case undefined: {
      // default to ignore the duplicate
      break;
    }
    case IGeneratorFindDuplicateStrategy.debounce: {
      sameEventIndexInEventCache = checkEventCacheDebounceDuplication(newEventCacheItem, eventCache, configs);
      if (sameEventIndexInEventCache > -1) {
        hasDuplicate = true;
      } else {
        // No duplicate in the event cache, also check event log
        hasDuplicate = checkEventLogDebounceDuplication(newEventCacheItem, eventLog, configs);
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
      if (hasDuplicate) {
        onItemDuplicateAndCanceled(newEventCacheItem);
        break;
      }
      eventCache.push(newEventCacheItem);
      hasModification = true;
      break;
    }
    case IGeneratorOnDuplicateStrategy.append: {
      eventCache.push(newEventCacheItem);
      hasModification = true;
      break;
    }
    case IGeneratorOnDuplicateStrategy.overwrite: {
      if (sameEventIndexInEventCache === -1) {
        eventCache.push(newEventCacheItem);
      } else {
        eventCache[sameEventIndexInEventCache] = newEventCacheItem;
      }
      hasModification = true;
      break;
    }
  }
  if (hasModification) {
    addEventLog(eventLog, newEventCacheItem);
  }
  return hasModification;
}
