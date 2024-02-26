/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { IFilterOperator } from 'tiddlywiki';

export const starthourlatethan = ((source, operator): string[] => {
  const duration = operator.operand;
  const hourStart = Number(duration);
  if (!Number.isFinite(hourStart)) return [];
  const results: string[] = [];
  source(function(tiddler, title) {
    if (tiddler) {
      const startDate = $tw.utils.parseDate((tiddler.fields.startDate as string | undefined) ?? '');
      if (startDate === null) return;
      if (startDate.getHours() >= hourStart) {
        results.push(title);
      }
    }
  });
  return results;
}) satisfies IFilterOperator;
