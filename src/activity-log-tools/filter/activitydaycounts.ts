/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { getActivityLog } from '$:/plugins/linonetwo/activity-log-tools/log-file-tools/getActivityLog';
import { IFilterOperator, Tiddler } from 'tiddlywiki';
import { DAY_INTERVAL, LogFileTypes } from '../log-file-types/LogFileTypes';

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
    const { items, type: logTypes } = activityLog;
    switch (logTypes) {
      case LogFileTypes.DailyCount: {
        const dailyCountRowsInRange = new Map<Date, number[]>();
        for (const [rowStartDateString, rowOfCountsString] of items) {
          const rowStartDate = new Date(Number(rowStartDateString.replace(LogFileTypes.DailyCount, '')));
          if (rowStartDate.getTime() < filterRangeStartDate.getTime() || rowStartDate.getTime() > filterRangeEndDate.getTime()) {
            continue;
          }
          // value is comma separated value, each is a count for that day, started at rowStartDateString
          const rowOfCounts = rowOfCountsString.split(',').map(item => {
            const count = Number(item);
            if (Number.isInteger(count)) return count;
            else return 0;
          });
          dailyCountRowsInRange.set(rowStartDate, rowOfCounts);
        }
        const dateWithCount = [...dailyCountRowsInRange]
          .flatMap(([rowStartDate, rowOfCounts]) => {
            return rowOfCounts.map((count, index) => {
              const date = new Date(rowStartDate);
              date.setDate(date.getDate() + index); // Add index to the date
              if (date.getMonth() !== rowStartDate.getMonth()) {
                // Handle spanning multiple months
                date.setMonth(rowStartDate.getMonth());
                date.setFullYear(rowStartDate.getFullYear() + Math.floor((rowStartDate.getMonth() + index) / 12));
                date.setMonth((rowStartDate.getMonth() + index) % 12);
              }
              return [date, count] as const;
            });
          });
        const filteredAndSortedCounts = dateWithCount
          .filter(([date]) => date >= filterRangeStartDate && date <= filterRangeEndDate)
          .sort(([dateA], [dateB]) => dateA.getTime() - dateB.getTime())
          .map(([, count]) => count)
          .join(',');
        results.push(filteredAndSortedCounts);
        break;
      }

      case LogFileTypes.Date: {
        const dateCounts = new Map<number, number>();
        items.forEach(dateString => {
          const currentDate = new Date(Number(dateString));
          if (currentDate >= filterRangeStartDate && currentDate <= filterRangeEndDate) {
            // Normalize to YYYY-MM-DD to count same day, then use number for key
            const dateKey = getLocaleDateKey(currentDate);
            dateCounts.set(dateKey, (dateCounts.get(dateKey) ?? 0) + 1);
          }
        });
        results.push(getSortedCount(filterRangeStartDate, filterRangeEndDate, dateCounts));
        break;
      }

      case LogFileTypes.DayInterval: {
        const dateCounts = new Map<number, number>();
        items.forEach((intervalsString, key) => {
          const lastDateString = key.replace('day-interval', '');
          const intervals = intervalsString.split(',').map(Number);
          let currentDate = new Date(Number(lastDateString));

          intervals.reverse().forEach(interval => {
            // Subtract the interval from the current date to find the event date
            currentDate = new Date(currentDate.getTime() - interval * DAY_INTERVAL); // Subtract interval days
            if (currentDate >= filterRangeStartDate && currentDate <= filterRangeEndDate) {
              // count activities by day, use locale date.
              // Normalize to YYYY-MM-DD to count same day, then use number for key
              const dateKey = getLocaleDateKey(currentDate);
              dateCounts.set(dateKey, (dateCounts.get(dateKey) ?? 0) + 1);
            }
          });
        });

        results.push(getSortedCount(filterRangeStartDate, filterRangeEndDate, dateCounts));
        break;
      }

      default: {
        results.push('');
      }
    }
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

function getSortedCount(filterRangeStartDate: Date, filterRangeEndDate: Date, dateCounts: Map<number, number>) {
  // Ensure every date in the range is accounted for in dateCounts
  for (let day = filterRangeStartDate.getTime(); day <= filterRangeEndDate.getTime(); day += 86_400_000) { // Add one day in milliseconds
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
