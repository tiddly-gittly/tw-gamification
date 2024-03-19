/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { ILogFile, IRealityEventLogKey, LogFileTypes } from '../log-file-types/LogFileTypes';
import { isValidLogData } from './checkEventLog';

/**
 * Will create a new log file if not exist.
 * So if you don't want to create a new log file, you should not call this.
 * @returns Event log or undefined, undefined means no need to consider event log, for example, one-time event triggered in tutorial.
 */
export function getEventLog(logTiddlerType: LogFileTypes, logTiddlerTitle: string): ILogFile | undefined {
  const tiddlerExists = $tw.wiki.getTiddler(logTiddlerTitle) !== undefined;
  if (!tiddlerExists) {
    // create a new log file if not exist.
    $tw.wiki.addTiddler({ title: logTiddlerTitle, tags: ['$:/Tags/Gamification/RealityEventLog'], type: 'application/x-tiddler-dictionary', text: '', 'hide-body': 'yes' });
  }
  const items = $tw.wiki.getTiddlerData(logTiddlerTitle);
  if (!isValidLogData(items)) {
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
    items: new Map<IRealityEventLogKey, string>(Object.entries(items)),
    title: logTiddlerTitle,
    type: logTiddlerType,
  } as ILogFile;
}
