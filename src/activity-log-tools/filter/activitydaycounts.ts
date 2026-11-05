import { getActivityLog } from '$:/plugins/linonetwo/activity-log-tools/log-file-tools/getActivityLog';
import { IFilterOperator, Tiddler } from 'tiddlywiki';
import { LogFileTypes } from '../log-file-types/LogFileTypes';

/**
 * Output comma separated numbers like the one in `LogFileTypes.DailyCount`.
 * Given a date range, we output the activity count per day. For `LogFileTypes.DailyCount` we simply find the range in the log file and output it. For other file types we need to do some calculation to transform it to `LogFileTypes.DailyCount` before output.
 *
 * ```
 * [[logFileTitle]activitydaycounts<weekstart>,<weekend>[]]
 * ```
 */
export const activitydaycounts = ((source, operator): string[] => {
  const results: string[] = [];
  source(function(tiddler, title) {
    const [dateStartString, dateEndString] = operator.operands;
    const rangeAndLogFile = getRangeAndLogFile(tiddler, title, dateStartString, dateEndString);
    if (rangeAndLogFile === undefined) {
      results.push('');
      return;
    }
    const [filterRangeStartDate, filterRangeEndDate, activityLog] = rangeAndLogFile;
    const codec = require('../log-file-tools/activityLogCodec');
    const counts = new Map<number, number>();
    for (const timestamp of codec.decode(Object.fromEntries(activityLog.items), activityLog.type)) {
      const date = new Date(timestamp);
      if (date < filterRangeStartDate || date > filterRangeEndDate) continue;
      const key = getLocaleDateKey(date);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    results.push(getSortedCount(filterRangeStartDate, filterRangeEndDate, counts));

  });
  return results;
}) satisfies IFilterOperator;

function getRangeAndLogFile(tiddler: Tiddler | undefined, title: string, dateStartString: string | undefined, dateEndString: string | undefined) {
  const logTiddlerType = tiddler?.fields['activity-log-type'] as LogFileTypes | undefined;
  if (logTiddlerType === undefined || dateStartString === undefined || dateEndString === undefined) {
    // activity log file should have a type, if it is not defined, we can't do anything.
    return undefined;
  }
  const activityLog = getActivityLog(title, logTiddlerType);
  if (activityLog === undefined) {
    return undefined;
  }
  let [dateStart, dateEnd] = [dateStartString, dateEndString].map(twDateString => {
    if (/^[+-]?\d+$/.test(twDateString) && twDateString.length < 8) {
      const d = new Date();
      d.setHours(0, 0, 0, 0); // start of today
      d.setDate(d.getDate() + Number(twDateString));
      return d;
    }
    const newDate = $tw.utils.parseDate(twDateString);
    return newDate === null || Number.isNaN(newDate.getTime()) ? new Date() : newDate;
  });

  // make sure start is smaller than end
  if (dateStart.getTime() > dateEnd.getTime()) {
    const temporary = dateStart;
    dateStart = dateEnd;
    dateEnd = temporary;
  }
  dateStart.setHours(0, 0, 0, 0);
  dateEnd.setHours(23, 59, 59, 999);
  return [dateStart, dateEnd, activityLog] as const;
}

function getSortedCount(filterRangeStartDate: Date, filterRangeEndDate: Date, dateCounts: Map<number, number>) {
  // Ensure every date in the range is accounted for in dateCounts
  for (const date = new Date(filterRangeStartDate); date <= filterRangeEndDate; date.setDate(date.getDate() + 1)) {
    const day = date.getTime();
    if (!dateCounts.has(day)) {
      dateCounts.set(day, 0);
    }
  }
  // Convert the dateCounts map to an array, sort by date, extract counts, and join them
  const sortedCounts = [...dateCounts]
    .sort(([timeA], [timeB]) => timeA - timeB)
    .map(([, count]) => count)
    .join(',');
  return sortedCounts;
}

function getLocaleDateKey(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() is zero-indexed
  const day = date.getDate();
  // Create a new Date object with the local date components at midnight
  const localDate = new Date(year, month - 1, day);
  // Return the timestamp (in milliseconds) of the local date at midnight
  return localDate.getTime();
}
