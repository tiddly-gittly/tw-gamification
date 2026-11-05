import { IFilterOperator } from 'tiddlywiki';
const codec = require('../log-file-tools/activityLogCodec');

/** Count any supported log format, including after format conversion. */
export const dailycountstat = ((source, operator): string[] => {
  const results: string[] = [];
  const day = operator.operand && operator.operand !== 'today'
    ? codec.dayKey(codec.localDate(operator.operand))
    : codec.dayKey(Date.now());
  source((_tiddler, title) => {
    const {type, data} = codec.read($tw.wiki, title);
    results.push(String(codec.decode(data, type).filter((time: number) => codec.dayKey(time) === day).length));
  });
  return results;
}) satisfies IFilterOperator;
export const medicinecheckinstat = dailycountstat;
