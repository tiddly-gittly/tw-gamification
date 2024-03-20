import { IDailyCountKey, IDayIntervalKey, IActivityLogFile, LogFileTypes } from '../log-file-types/LogFileTypes';

/** 30 days in ms */
const MAX_ACTIVITY_LOG_ITEM_DURATION = 30 * 24 * 60 * 60 * 1000;

export function addActivityToLog(activityLog: IActivityLogFile | undefined, newActivityTimestamp: number) {
  if (activityLog === undefined) return;
  const { items, type: logFileTypes } = activityLog;
  switch (logFileTypes) {
    case LogFileTypes.Date: {
      const nextDateIndex = String(Object.keys(items).length);
      items.set(nextDateIndex, String(newActivityTimestamp));
      break;
    }
    case LogFileTypes.DailyCount: {
      /**
       * ```yaml
       * daily-count1609459200000: 1,0,0,0,3,0,0
       * ```
       */
      const today = new Date(newActivityTimestamp);
      // check if latest item's timestamp is within 30 days
      const latestItemKey = ([...items.keys()] as IDailyCountKey[]).filter(key => key.startsWith(LogFileTypes.DailyCount)).sort().pop();
      if (latestItemKey === undefined) {
        // directly add a new line
        items.set(`${LogFileTypes.DailyCount}${today.getTime()}`, '1');
      } else {
        const latestItemDate = new Date(Number(latestItemKey.replace(LogFileTypes.DailyCount, '')));
        const nextDateKey: IDailyCountKey = `${LogFileTypes.DailyCount}${today.getTime()}`;
        const latestItem = items.get(latestItemKey);
        if (latestItem === undefined || ((today.getTime() - latestItemDate.getTime()) > MAX_ACTIVITY_LOG_ITEM_DURATION)) {
          // > 30 days, create a new item
          // 1 means count today do this 1 times.
          items.set(nextDateKey, '1');
        } else {
          const latestItemValue = latestItem.split(',');
          // reuse the latest item, if last modify date is in same day of today, then + 1, otherwise create a new 1
          if (today.toDateString() === latestItemDate.toDateString()) {
            latestItemValue[latestItemValue.length - 1] = String(Number(latestItemValue.at(-1)) + 1);
          } else {
            latestItemValue.push('1');
          }
          // write back, and update the time in the key
          items.delete(latestItemKey);
          items.set(nextDateKey, latestItemValue.join(','));
        }
      }
      break;
    }
    case LogFileTypes.DayInterval: {
      // day-interval1609459200000: 0.4,0.6,2.4,5.8,4.93,0.94,0.86,0.01,1.49,0.14,0.94,2.18
      const today = new Date(newActivityTimestamp);
      // check if latest item's timestamp is within 30 days
      const latestItemKey = ([...items.keys()] as IDayIntervalKey[]).filter(key => key.startsWith(LogFileTypes.DayInterval)).sort().pop();
      if (latestItemKey === undefined) {
        // directly add a new line
        items.set(`${LogFileTypes.DayInterval}${today.getTime()}`, '0');
      } else {
        const latestItemDate = new Date(Number(latestItemKey.replace(LogFileTypes.DayInterval, '')));
        const latestItem = items.get(latestItemKey);
        if (latestItem === undefined || ((today.getTime() - latestItemDate.getTime()) > MAX_ACTIVITY_LOG_ITEM_DURATION)) {
          // > 30 days, create a new item
          const nextDateKey: IDayIntervalKey = `${LogFileTypes.DayInterval}${today.getTime()}`;
          // in interval mode, first one is always 0. Later ones are the interval between the last one and the modify date in the key.
          items.set(nextDateKey, '0');
        } else {
          const latestItemValue = latestItem.split(',');
          // reuse the latest item, calculate the duration use last modify date and now
          const lastInterval = today.getTime() - latestItemDate.getTime();
          latestItemValue.push(formatDayInterval(lastInterval));
          // write back, and update the time in the key
          items.delete(latestItemKey);
          items.set(latestItemKey, latestItemValue.join(','));
        }
      }
      break;
    }
  }

  // set back to wiki
  updateActivityLogFile(activityLog);
}

/**
 * Minimum interval is `0.00001` days (1 min), but we can store it based on interval, if it is larger than 1 day, then store with `toFixed(1)`, if is between 1 hour and 1 day, then store with `toFixed(2)` for `0.04` (1/24), if is between 1 min and 1 hour, then store with `toFixed(5)` for `0.00001`.
 */
function formatDayInterval(intervalInMs: number): string {
  const intervalInDay = intervalInMs / (24 * 60 * 60 * 1000);
  if (intervalInDay >= 1) {
    return intervalInDay.toFixed(1);
  } else if (intervalInDay >= 1 / 24) {
    return intervalInDay.toFixed(2);
  } else {
    return intervalInDay.toFixed(5);
  }
}

function updateActivityLogFile(activityLog: IActivityLogFile) {
  $tw.wiki.setTiddlerData(activityLog.title, Object.fromEntries(activityLog.items));
}
