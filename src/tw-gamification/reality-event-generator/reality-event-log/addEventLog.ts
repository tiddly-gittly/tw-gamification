import { addActivityToLog } from '$:/plugins/linonetwo/activity-log-tools/log-file-tools/addActivityToLog';
import type { IActivityLogFile } from 'src/activity-log-tools/log-file-types/LogFileTypes';
import { IRealityEventCacheCacheItem } from 'src/tw-gamification/reality-event-cache/RealityEventCacheTypes';

export function addEventLog(eventLog: IActivityLogFile | undefined, newEventCacheItem: IRealityEventCacheCacheItem) {
  if (eventLog === undefined) return;
  const { event } = newEventCacheItem;
  addActivityToLog(eventLog, event.timestamp);
}
