/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { getActivityLog } from '$:/plugins/linonetwo/activity-log-tools/log-file-tools/getActivityLog';
import { type IActivityLogFile, LogFileTypes } from 'src/activity-log-tools/log-file-types/LogFileTypes';
import { isEventGenerator } from '../baseRealityEventGeneratorType';
import { getDefaultEventLogTitle } from './defaultEventLogTitle';

/**
 * Will create a new log file if not exist, and `eventGeneratorTitle` is not `undefined`.
 * So if you don't want to create a new log file, you should not call this. Or pass `undefined` to `eventGeneratorTitle`.
 * @returns Event log or undefined, undefined means no need to consider event log, for example, one-time event triggered in tutorial.
 */
export function getEventLog(eventGeneratorTitle: string | undefined): IActivityLogFile | undefined {
  if (eventGeneratorTitle === undefined) return undefined;
  const eventGeneratorTiddler = $tw.wiki.getTiddler(eventGeneratorTitle);
  if (!isEventGenerator(eventGeneratorTiddler?.fields)) {
    return undefined;
  }
  const logTiddlerTitle = eventGeneratorTiddler.fields['reality-event-log'] || getDefaultEventLogTitle(eventGeneratorTitle);
  const logTiddlerType: LogFileTypes = (eventGeneratorTiddler.fields['reality-event-log-type'] || LogFileTypes.Date) as LogFileTypes;
  return getActivityLog(logTiddlerType, logTiddlerTitle);
}
