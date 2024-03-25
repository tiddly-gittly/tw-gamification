import { ITiddlerFields } from 'tiddlywiki';

/**
 * We save event log in text of tiddler with tag `$:/Tags/ActivityLog`, and use data tiddler with fields ends with a UTC time number (`DailyCount123time` `DayInterval`).
 * Actions can use `activity-log` field to point to the log file containing the data described below.
 *
 * ```tid
 * hide-body: yes
 * type: application/x-tiddler-dictionary
 * title:
 */
export enum LogFileTypes {
  /**
   * Use bloom filter or counter like
   *
   * ```yaml
   * daily-count1609459200000: 1,0,0,0,3,0,0
   * ```
   *
   * Each row starts with `daily-count`, and follow with a date representing the last date of modification, created by `new Date('2021-01-01').getTime()`, and updated on each modify. Each line is for a month, if the value in this row is more than 30, then need to start a new row.
   */
  DailyCount = 'daily-count',
  /**
   * Store each date. Suitable for very infrequent events, or events that happened in a short period, but won't happened for a long period.
   * We only include the date here for visualization, and for privacy not recoding the title here.
   * This is the simplest form of event log, used by default.
   *
   * ```yaml
   * 0: 1609459200000
   * 1: 1609459200001
   * 2: 1609459200002
   * 3: 1609459200003
   * ```
   */
  Date = 'date',
  /**
   * Record the intervals in days (0.4 days, 0.6 days, 2.4 days for interval of clock in)
   * Calculate out each of the previous time points in time based on the last date of the line and the intervals. (last point is the time in lastdate field, last 2nd point is lastdate - 2.61 days). Minimum interval is `0.00001` days (1 min), but we can store it based on interval, if it is larger than 1 day, then store with `toFixed(1)`, if is between 1 hour and 1 day, then store with `toFixed(2)` for `0.04` (1/24), if is between 1 min and 1 hour, then store with `toFixed(5)` for `0.00001`.
   *
   * ```yaml
   * day-interval1609459200000: 0.4,0.6,2.4,5.8,4.93,0.94,0.86,0.01,1.49,0.14,0.94,2.18
   * ```
   *
   * Each row starts with `day-interval-`, and follow with a date representing the last date of modification, same as `DailyCount`. Each line is for a month, if the value in this row is more than 30, then need to start a new row.
   */
  DayInterval = 'day-interval',
}

export type IDailyCountKey = `${LogFileTypes.DailyCount}${number}`;
export type IDayIntervalKey = `${LogFileTypes.DayInterval}${number}`;
export type IDateKey = string;
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type IActivityLogKey = IDailyCountKey | IDayIntervalKey | IDateKey;
/**
 * Each action or generator have a event log file, text is a DictionaryTiddler described in RealityEventLogTypes.
 * We left the value of each row as string, you need to find the key you want to use, and parse the value as number or date.
 */
export type IActivityLogFile = {
  exists: boolean;
  items: Map<IDailyCountKey, string>;
  title: string;
  type: LogFileTypes.DailyCount;
} | {
  exists: boolean;
  items: Map<IDayIntervalKey, string>;
  title: string;
  type: LogFileTypes.DayInterval;
} | {
  exists: boolean;
  items: Map<IDateKey, string>;
  title: string;
  type: LogFileTypes.Date;
};

export interface IActivityLogTiddlerFields extends ITiddlerFields {
  /**
   * Indicate the format of event log file. Default to `date`.
   */
  'activity-log-file-type': LogFileTypes;
  type: 'application/x-tiddler-dictionary';
}
