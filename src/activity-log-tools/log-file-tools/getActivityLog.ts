/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { isValidActivityLogData } from '$:/plugins/linonetwo/activity-log-tools/log-file-tools/checkActivityLog';
import { IActivityLogFile, IActivityLogKey, LogFileTypes } from '../log-file-types/LogFileTypes';

/**
 * @returns Event log in memory, may not existed in tiddler store, you still need to call createActivityLog to create it.
 */
export function getActivityLog(logTiddlerTitle: string, logTiddlerType: LogFileTypes): IActivityLogFile {
  const tiddlerExists = $tw.wiki.getTiddler(logTiddlerTitle) !== undefined;
  const items = $tw.wiki.getTiddlerData(logTiddlerTitle);
  if (!isValidActivityLogData(items)) {
    // return empty one with default type
    return {
      exists: tiddlerExists,
      items: new Map(),
      title: logTiddlerTitle,
      type: logTiddlerType,
    };
  }
  return {
    exists: tiddlerExists,
    items: new Map<IActivityLogKey, string>(Object.entries(items)),
    title: logTiddlerTitle,
    type: logTiddlerType,
  } as IActivityLogFile;
}
