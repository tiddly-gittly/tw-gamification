/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { IFilterOperator } from 'tiddlywiki';

export const endhourearlythan = ((source, operator): string[] => {
  const duration = operator.operand;
  const hourEnd = Number(duration);
  if (!Number.isFinite(hourEnd)) return [];
  const results: string[] = [];
  source(function(tiddler, title) {
    if (tiddler) {
      const endDate = $tw.utils.parseDate((tiddler.fields.endDate as string | undefined) ?? '');
      if (endDate === null) return;
      if (endDate.getHours() <= hourEnd) {
        results.push(title);
      }
    }
  });
  return results;
}) satisfies IFilterOperator;
