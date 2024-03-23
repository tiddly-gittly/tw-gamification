/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { IActivityLogFile, LogFileTypes } from 'src/activity-log-tools/log-file-types/LogFileTypes';
import { IRealityEventCacheCacheItem } from 'src/tw-gamification/reality-event-cache/RealityEventCacheTypes';
import type { formatDuplicationFields } from '../deduplication/formatDuplicationFields';

export function checkEventLogDebounceDuplication(
  newEventCacheItem: IRealityEventCacheCacheItem,
  eventLog: IActivityLogFile | undefined,
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
    case LogFileTypes.Date: {
      const latestItemValue = [...items.values()].sort().pop();
      if (latestItemValue === undefined) {
        hasDuplicate = false;
        break;
      }
      const latestItemDate = new Date(Number(latestItemValue));
      hasDuplicate = (today - latestItemDate.getTime()) < debounceDuration;
      break;
    }
    case LogFileTypes.DailyCount: {
      const latestItemKey = (Object.keys(items)).filter(key => key.startsWith(LogFileTypes.DailyCount)).sort().pop();
      if (latestItemKey === undefined) {
        hasDuplicate = false;
        break;
      }
      const latestItemDate = new Date(Number(latestItemKey.replace(LogFileTypes.DailyCount, '')));
      hasDuplicate = (today - latestItemDate.getTime()) < debounceDuration;
      break;
    }
    case LogFileTypes.DayInterval: {
      const latestItemKey = (Object.keys(items)).filter(key => key.startsWith(LogFileTypes.DayInterval)).sort().pop();
      if (latestItemKey === undefined) {
        hasDuplicate = false;
        break;
      }
      const latestItemDate = new Date(Number(latestItemKey.replace(LogFileTypes.DayInterval, '')));
      hasDuplicate = (today - latestItemDate.getTime()) < debounceDuration;
      break;
    }
  }
  return hasDuplicate;
}
