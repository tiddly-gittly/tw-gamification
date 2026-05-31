import { createActivityLog } from '$:/plugins/linonetwo/activity-log-tools/log-file-tools/createActivityLog';
import { DAY_INTERVAL, IActivityLogFile, IDailyCountKey, IDayIntervalKey, LogFileTypes } from '../log-file-types/LogFileTypes';

/** 30 days in ms */
const MAX_ACTIVITY_LOG_ITEM_DURATION = 30 * DAY_INTERVAL;

function midnightOf(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getLatestDailyCountKey(items: Map<IDailyCountKey, string>): IDailyCountKey | undefined {
  let latestKey: IDailyCountKey | undefined;
  let latestTs = -1;
  for (const key of items.keys()) {
    if (!key.startsWith(LogFileTypes.DailyCount)) continue;
    const ts = Number(key.slice(LogFileTypes.DailyCount.length));
    if (Number.isFinite(ts) && ts > latestTs) {
      latestTs = ts;
      latestKey = key;
    }
  }
  return latestKey;
}

function setEntryFirst(items: Map<string, string>, key: string, value: string): void {
  const rest = [...items].filter(([existingKey]) => existingKey !== key);
  items.clear();
  items.set(key, value);
  for (const [existingKey, existingValue] of rest) {
    items.set(existingKey, existingValue);
  }
}

export function addActivityToLog(activityLog: IActivityLogFile | undefined, newActivityTimestamp: number) {
  if (activityLog === undefined) return;
  const { items, type: logFileTypes, modifiedAt } = activityLog;
  if (!Number.isFinite(newActivityTimestamp) || newActivityTimestamp <= 0) return;

  switch (logFileTypes) {
    case LogFileTypes.Date: {
      const nextDateIndex = String(Object.keys(items).length);
      items.set(nextDateIndex, String(newActivityTimestamp));
      break;
    }
    case LogFileTypes.DailyCount: {
      /**
      * Each row key is `daily-count{midnightMs}` where `midnightMs` is
      * midnight of the row's last day. The value is a comma-separated
       * list of daily counts, newest last.
       *
       * ```yaml
       * daily-count1609459200000: 1,0,0,0,3,0,0
       * ```
       *
      * modifiedAt (from tiddler.modified) is captured before this write, so
      * it is the previous check-in time for gap detection.
       */
      const todayMidnight = midnightOf(newActivityTimestamp);
      const todayMidnightKey: IDailyCountKey = `${LogFileTypes.DailyCount}${todayMidnight}`;
      const dailyCountItems = items as Map<IDailyCountKey, string>;

      const latestItemKey = getLatestDailyCountKey(dailyCountItems);
      if (latestItemKey === undefined) {
        // No existing row: create the first one.
        setEntryFirst(dailyCountItems, todayMidnightKey, '1');
        break;
      }

      const latestItem = dailyCountItems.get(latestItemKey);
      const latestItemTimestamp = Number(latestItemKey.slice(LogFileTypes.DailyCount.length));
      const lastWriteMidnight = modifiedAt === undefined ? latestItemTimestamp : midnightOf(modifiedAt);

      if (latestItem === undefined || (todayMidnight - lastWriteMidnight > MAX_ACTIVITY_LOG_ITEM_DURATION)) {
        // More than 30 days since last write: start a new row.
        // Keep the old row for historical data.
        setEntryFirst(dailyCountItems, todayMidnightKey, '1');
      } else if (todayMidnight === lastWriteMidnight) {
        // Same day: increment the last count.
        const values = latestItem.split(',');
        values[values.length - 1] = String(Number(values.at(-1)) + 1);
        dailyCountItems.delete(latestItemKey);
        setEntryFirst(dailyCountItems, todayMidnightKey, values.join(','));
      } else {
        // Different day within 30 days: fill zeros for gap days, then append 1 for today.
        const values = latestItem.split(',');
        const gapDays = Math.round((todayMidnight - lastWriteMidnight) / DAY_INTERVAL);
        for (let i = 1; i < gapDays; i++) {
          values.push('0');
        }
        values.push('1');
        dailyCountItems.delete(latestItemKey);
        setEntryFirst(dailyCountItems, todayMidnightKey, values.join(','));
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
  const intervalInDay = intervalInMs / DAY_INTERVAL;
  if (intervalInDay >= 1) {
    return intervalInDay.toFixed(1);
  } else if (intervalInDay >= 1 / 24) {
    return intervalInDay.toFixed(2);
  } else {
    return intervalInDay.toFixed(5);
  }
}

function updateActivityLogFile(activityLog: IActivityLogFile) {
  // create new one if not exist.
  createActivityLog(activityLog.type, { title: activityLog.title });
  // need to create one before save, to have `fields.type === "application/x-tiddler-dictionary"`, otherwise tw will save as json instead.
  $tw.wiki.setTiddlerData(activityLog.title, Object.fromEntries(activityLog.items));
  removeActivityLogFields(activityLog);
}

function removeActivityLogFields(activityLog: IActivityLogFile): void {
  const tiddler = $tw.wiki.getTiddler(activityLog.title);
  if (tiddler === undefined) return;

  const fieldsToRemove = Object.keys(tiddler.fields).filter(field => field.startsWith(activityLog.type));
  if (fieldsToRemove.length === 0) return;

  const fields = { ...tiddler.fields };
  for (const field of fieldsToRemove) {
    delete fields[field];
  }
  $tw.wiki.addTiddler(fields);
}
