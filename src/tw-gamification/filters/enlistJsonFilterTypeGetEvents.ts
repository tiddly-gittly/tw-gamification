/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { IFilterOperator } from 'tiddlywiki';
import { IGameEventLogCacheFile } from '../event-queue/GamificationEventLogTypes';

export const enlistJsonFilterTypeGetEvents = ((source, operator): string[] => {
  const [typeOfEventToFilter, titleOfGeneratorToFilter] = operator.operands;
  const results: string[] = [];
  source(function(_, jsonString) {
    const jsonArray = $tw.utils.parseJSONSafe(jsonString);
    if (Array.isArray(jsonArray)) {
      (jsonArray as IGameEventLogCacheFile).forEach((item) => {
        /** If generator title is provided, check it. Otherwise let it pass. */
        const isGeneratorMatch = titleOfGeneratorToFilter ? item.meta.generator === titleOfGeneratorToFilter : true;
        /** If eventType is provided, check it. Otherwise let it pass. */
        const isEventTypeMatch = typeOfEventToFilter ? item.event.type === typeOfEventToFilter : true;
        /** If both filter is not provided, this is just become enlistJsonGetEvents */
        if (isGeneratorMatch && isEventTypeMatch) {
          results.push(JSON.stringify(item.event));
        }
      });
    }
  });
  return results;
}) satisfies IFilterOperator;
