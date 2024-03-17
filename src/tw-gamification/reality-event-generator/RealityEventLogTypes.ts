/**
 * We save event log in text of tiddler with tag `$:/Tags/Gamification/RealityAction` or `$:/Tags/Gamification/ChangeFilter`, and use data tiddler with two fields (`lastdate` `daily-activity`).
 * // TODO: see data tiddler parsing code, to see if each line is parsed lazily. If so, we sharding the data into multiple fields might be a good idea. (Field name is `daily-activity-2021-01`, and each for a month.)
 */
export enum RealityEventLogTypes {
  /**
   * Use bloom filter or counter like
   *
   * ```yaml
   * lastdate: 2021-01-01
   * daily-activity: 1,0,0,0,3,0,0
   * ```
   */
  Daily = 'Daily',
  /**
   * Record the intervals in days (0.4 days, 0.6 days, 2.4 days for interval of clock in)
   * Calculate out each of the previous time points in time based on the lastdate field of the log file and the intervals. (last point is the time in lastdate field, last 2nd point is lastdate - 2.61 days)
   *
   * ```yaml
   * lastdate: 2021-01-01
   * daily-activity: 0.4,0.6,2.4,5.8,4.93,0.94,0.86,0.01,1.49,0.14,0.94,2.18
   * ```
   */
  DayInterval = 'DayInterval',
  /**
   * Store titles with the date. Suitable for very infrequent events, or events that happened in a short period, but won't happened for a long period.
   * We can't use filter to generate the data dynamically, because some of them might be deleted afterwards.
   *
   * ```yaml
   * title1: 2021-01-01
   * title2: 2021-01-01
   * title3: 2021-01-01
   * ```
   */
  Titles = 'Titles',
}
