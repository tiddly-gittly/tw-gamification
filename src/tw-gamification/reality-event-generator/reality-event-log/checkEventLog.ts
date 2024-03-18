import { IRealityEventCacheCacheItem } from 'src/tw-gamification/reality-event-cache/RealityEventCacheTypes';
import { IRealityEventLogFile } from './RealityEventLogTypes';

export function checkEventLogDuplication(eventLog: IRealityEventLogFile | undefined, newEventCacheItem: IRealityEventCacheCacheItem): boolean {
  if (eventLog === undefined) return false;
  const { event } = newEventCacheItem;
  const { items, type: realityEventLogTypes } = eventLog;
  let hasDuplicate = false;
  switch (realityEventLogTypes) {
    case 'date': {
      const today = new Date(event.timestamp);
      const todayString = today.toDateString();
      const hasSameDate = [...items.values()].some((timestampString) => {
        const timestamp = Number(timestampString);
        const date = new Date(timestamp);
        return date.toDateString() === todayString;
      });
      if (hasSameDate) {
        hasDuplicate = true;
      }
      break;
    }
    case 'daily-count': {
      const today = new Date(event.timestamp);
      const todayString = today.toDateString();
      const hasSameDate = [...items.values()].some((countString) => {
        const count = Number(countString);
        return count > 0;
      });
      if (hasSameDate) {
        hasDuplicate = true;
      }
      break;
    }
    case 'day-interval': {
      const today = new Date(event.timestamp);
      const todayString = today.toDateString();
      const hasSameDate = [...items.values()].some((intervalString) => {
        const interval = Number(intervalString);
        return interval > 0;
      });
      if (hasSameDate) {
        hasDuplicate = true;
      }
      break;
    }
  }
  return hasDuplicate;
}
