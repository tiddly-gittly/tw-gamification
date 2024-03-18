/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { IRealityEventCacheCacheItem } from 'src/tw-gamification/reality-event-cache/RealityEventCacheTypes';
import type { formatDuplicationFields } from '../deduplication/formatDuplicationFields';
import { IRealityEventLogFile, RealityEventLogTypes } from './RealityEventLogTypes';

export function checkEventLogDebounceDuplication(
  newEventCacheItem: IRealityEventCacheCacheItem,
  eventLog: IRealityEventLogFile | undefined,
  configs: ReturnType<typeof formatDuplicationFields>,
): boolean {
  const checkGeneratorTitle = configs['debounce-generator-title'] === 'yes';
  if (!checkGeneratorTitle) return false;
  const checkTiddlerTitle = configs['debounce-tiddler-title'] === 'yes';
  const conditionIsAnd = configs['debounce-tiddler-condition'] === 'and';
  // we don't have tiddler title in the event log, so we can't check it, pretend to be no duplicate
  if (checkTiddlerTitle && conditionIsAnd) return false;
  if (eventLog === undefined) return false;
  const { event } = newEventCacheItem;
  const today = new Date(event.timestamp).getTime();
  const { items, type: realityEventLogTypes } = eventLog;
  let hasDuplicate = false;
  const debounceDuration = configs['debounce-duration'];
  switch (realityEventLogTypes) {
    case RealityEventLogTypes.Date: {
      const latestItemValue = [...items.values()].sort().pop();
      if (latestItemValue === undefined) {
        hasDuplicate = false;
        break;
      }
      const latestItemDate = new Date(Number(latestItemValue));
      hasDuplicate = (today - latestItemDate.getTime()) < debounceDuration;
      break;
    }
    case RealityEventLogTypes.DailyCount: {
      const latestItemKey = (Object.keys(items)).filter(key => key.startsWith(RealityEventLogTypes.DailyCount)).sort().pop();
      if (latestItemKey === undefined) {
        hasDuplicate = false;
        break;
      }
      const latestItemDate = new Date(Number(latestItemKey.replace(RealityEventLogTypes.DailyCount, '')));
      hasDuplicate = (today - latestItemDate.getTime()) < debounceDuration;
      break;
    }
    case RealityEventLogTypes.DayInterval: {
      const latestItemKey = (Object.keys(items)).filter(key => key.startsWith(RealityEventLogTypes.DayInterval)).sort().pop();
      if (latestItemKey === undefined) {
        hasDuplicate = false;
        break;
      }
      const latestItemDate = new Date(Number(latestItemKey.replace(RealityEventLogTypes.DayInterval, '')));
      hasDuplicate = (today - latestItemDate.getTime()) < debounceDuration;
      break;
    }
  }
  return hasDuplicate;
}

export function isValidLogData(data: ReturnType<typeof $tw.wiki.getTiddlerData>): data is Record<string, string> {
  if (!data || Array.isArray(data)) {
    return false;
  }
  return true;
}
