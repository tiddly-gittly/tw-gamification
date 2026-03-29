/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { IFilterOperator } from 'tiddlywiki';
import { DAY_INTERVAL, LogFileTypes } from '../log-file-types/LogFileTypes';

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

      const rowStartDate = new Date(rowTimestamp);
      const rowValues = String(value).split(',');

      // Each element in rowValues represents one day starting from rowStartDate
      for (let i = 0; i < rowValues.length; i++) {
        const dayDate = new Date(rowTimestamp + i * DAY_INTERVAL);
        if (dayDate.toDateString() === targetDateString) {
          const parsed = Number(rowValues[i]);
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
