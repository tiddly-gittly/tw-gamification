import { isValidActivityLogData } from '$:/plugins/linonetwo/activity-log-tools/log-file-tools/checkActivityLog';
import { IActivityLogFile, IActivityLogKey, LogFileTypes } from '../log-file-types/LogFileTypes';

/**
 * @returns Event log in memory, may not existed in tiddler store, you still need to call createActivityLog to create it.
 */
export function getActivityLog(logTiddlerTitle: string, logTiddlerType: LogFileTypes): IActivityLogFile {
  const tiddler = $tw.wiki.getTiddler(logTiddlerTitle);
  const tiddlerExists = tiddler !== undefined;
  const items = $tw.wiki.getTiddlerData(logTiddlerTitle);
  const modified = tiddler?.fields?.modified;
  const modifiedAt = modified instanceof Date ? modified.getTime() : typeof modified === 'string' ? $tw.utils.parseDate(modified)?.getTime() : undefined;
  const lastModifiedAt = Number.isFinite(modifiedAt) && modifiedAt! > 0 ? modifiedAt : undefined;

  if (!isValidActivityLogData(items)) {
    return {
      exists: tiddlerExists,
      items: new Map(),
      title: logTiddlerTitle,
      type: logTiddlerType,
      ...(lastModifiedAt === undefined ? {} : { modifiedAt: lastModifiedAt }),
    };
  }
  return {
    exists: tiddlerExists,
    items: new Map<IActivityLogKey, string>(Object.entries(items)),
    title: logTiddlerTitle,
    type: logTiddlerType,
    ...(lastModifiedAt === undefined ? {} : { modifiedAt: lastModifiedAt }),
  } as IActivityLogFile;
}
