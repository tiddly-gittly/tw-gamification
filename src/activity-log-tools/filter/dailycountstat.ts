import { IFilterOperator } from 'tiddlywiki';
import { LogFileTypes } from '../log-file-types/LogFileTypes';

/**
 * Returns the count for a given day from a DailyCount activity log tiddler.
 *
 * Usage:
 * ```
 * [[logFileTitle]dailycountstat[today]]      → count for today
 * [[logFileTitle]dailycountstat[YYYY-MM-DD]] → count for a specific date
 * ```
 *
 * Operand `today` is a special keyword. Any other value is parsed as a date string (ISO 8601 YYYY-MM-DD).
 *
 * This is the low-level generic operator for reading DailyCount logs.
 * Alias `medicinecheckinstat` is provided for backward compatibility and readability.
 *
 * @param source - input titles (log tiddler titles)
 * @param operator - `{operand: 'today' | 'YYYY-MM-DD'}`
 * @returns count string per input title
 */
export const dailycountstat = ((source, operator): string[] => {
  const results: string[] = [];
  const operand = operator.operand ?? 'today';

  let targetDate: Date;
  if (operand === 'today') {
    targetDate = new Date();
  } else {
    targetDate = new Date(operand);
    if (Number.isNaN(targetDate.getTime())) {
      // Fallback to today if parse fails
      targetDate = new Date();
    }
  }

  // Normalize to midnight (local) so we compare date-only
  const targetDateString = targetDate.toDateString();

  source(function(_tiddler, title) {
    const rawData = $tw.wiki.getTiddlerData(title);
    if (typeof rawData !== 'object' || rawData === null) {
      results.push('0');
      return;
    }

    let count = 0;

    for (const [key, value] of Object.entries(rawData)) {
      if (!key.startsWith(LogFileTypes.DailyCount)) continue;

      const rowTimestamp = Number(key.replace(LogFileTypes.DailyCount, ''));
      if (!Number.isFinite(rowTimestamp)) continue;

      const rowValues = String(value).split(',');
      const rowEndDate = new Date(rowTimestamp);
      rowEndDate.setHours(0, 0, 0, 0);

      // Each row key stores the latest day in the row.
      // The last value maps to rowEndDate, and earlier values map backwards by day.
      for (let index = 0; index < rowValues.length; index++) {
        const dayDate = new Date(rowEndDate);
        dayDate.setDate(rowEndDate.getDate() - (rowValues.length - 1 - index));
        if (dayDate.toDateString() === targetDateString) {
          const parsed = Number(rowValues[index]);
          count += Number.isInteger(parsed) ? parsed : 0;
        }
      }
    }

    results.push(String(count));
  });

  return results;
}) satisfies IFilterOperator;

/**
 * Alias for `dailycountstat` kept for readability in medicine check-in contexts.
 * `[[logTitle]medicinecheckinstat[today]]`
 */
export const medicinecheckinstat = dailycountstat;
