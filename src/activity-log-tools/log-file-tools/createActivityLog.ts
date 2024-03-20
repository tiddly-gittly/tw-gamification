/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { ITiddlerFields } from 'tiddlywiki';
import { LogFileTypes } from '../log-file-types/LogFileTypes';

/**
 * Will create a new log file if not exist.
 * You need to add `title` to `fields` when calling this. And can add optionally `tags`.
 */
export function createActivityLog(logTiddlerType: LogFileTypes, fields: Partial<ITiddlerFields> & Pick<ITiddlerFields, 'title'>, options?: { overwrite?: boolean }): void {
  const tiddlerExists = $tw.wiki.getTiddler(fields.title) !== undefined;
  if (!tiddlerExists || options?.overwrite) {
    // create a new log file if not exist.
    $tw.wiki.addTiddler({
      ...fields,
      type: 'application/x-tiddler-dictionary',
      text: '',
      'hide-body': 'yes',
      'activity-log-file-type': logTiddlerType,
    });
  }
}
