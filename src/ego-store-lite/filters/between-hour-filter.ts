/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { IFilterOperator } from 'tiddlywiki';

export const betweenhour = ((source, operator) => {
  const results: string[] = [];
  source(function(tiddler, title) {
    if (tiddler) {
      const startDate = $tw.utils.parseDate((tiddler.fields.startDate as string | undefined) ?? '');
      const endDate = $tw.utils.parseDate((tiddler.fields.endDate as string | undefined) ?? '');
      if (startDate === null || endDate === null) return;
      const duration = operator.suffixes?.[0]?.map?.(Number);
      if (duration === undefined) return;
      const [hourStart, hourEnd] = duration;
      if (startDate.getHours() >= hourStart && endDate.getHours() <= hourEnd) {
        results.push(title);
      }
    }
  });
  return results;
}) satisfies IFilterOperator;
