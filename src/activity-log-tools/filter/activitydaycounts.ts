/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
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
    const [dateStart, dateEnd, activityLog] = rangeAndLogFile;
    const { items, type: logTypes } = activityLog;
    switch (logTypes) {
      case LogFileTypes.DailyCount: {
        const dailyCounts = new Map<string, number>();
        for (const [key, value] of items) {
          const date = new Date(Number(key));
          if (date.getTime() < dateStart.getTime() || date.getTime() > dateEnd.getTime()) {
            continue;
          }
          dailyCounts.set(key, Number(value));
        }
        results.push([...dailyCounts].map(([key, value]) => `${key},${value}`).join(','));
        break;
      }
      case LogFileTypes.Date:
      case LogFileTypes.DayInterval: {
        const dailyCounts = new Map<string, number>();
        for (let date = dateStart; date.getTime() <= dateEnd.getTime(); date.setDate(date.getDate() + 1)) {
          dailyCounts.set(date.toISOString(), 0);
        }
        for (const [key, value] of items) {
          const date = new Date(Number(key));
          if (date.getTime() < dateStart.getTime() || date.getTime() > dateEnd.getTime()) {
            continue;
          }
          dailyCounts.set(date.toISOString(), Number(value));
        }
        results.push([...dailyCounts].map(([key, value]) => `${key},${value}`).join(','));
        break;
      }
      default: {
        results.push('');
      }
    }
  });
  return results;
}) satisfies IFilterOperator;

function getRangeAndLogFile(tiddler: Tiddler | undefined, title: string, dateStartString: string, dateEndString: string) {
  const logTiddlerType = tiddler?.fields['activity-log-file-type'] as LogFileTypes | undefined;
  if (logTiddlerType === undefined) {
    // activity log file should have a type, if it is not defined, we can't do anything.
    return undefined;
  }
  const activityLog = getActivityLog(title, logTiddlerType);
  if (activityLog === undefined) {
    return undefined;
  }
  let [dateStart, dateEnd] = [dateStartString, dateEndString].map(twDateString => {
    const newDate = $tw.utils.parseDate(twDateString);
    return newDate === null || Number.isNaN(newDate.getTime()) ? new Date() : newDate;
  });
  if (dateStart.getTime() === dateEnd.getTime()) {
    return undefined;
  }
  // make sure start is smaller than end
  if (dateStart.getTime() > dateEnd.getTime()) {
    const temporary = dateStart;
    dateStart = dateEnd;
    dateEnd = temporary;
  }
  return [dateStart, dateEnd, activityLog] as const;
}
