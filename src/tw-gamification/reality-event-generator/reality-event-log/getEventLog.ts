/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { isEventGenerator } from '../baseRealityEventGeneratorType';
import { IRealityEventLogFile, IRealityEventLogKey, RealityEventLogTypes } from './RealityEventLogTypes';

/**
 * Will create a new log file if not exist, and `eventGeneratorTitle` is not `undefined`.
 * So if you don't want to create a new log file, you should not call this. Or pass `undefined` to `eventGeneratorTitle`.
 * @returns Event log or undefined, undefined means no need to consider event log, for example, one-time event triggered in tutorial.
 */
export function getEventLog(eventGeneratorTitle: string | undefined): IRealityEventLogFile | undefined {
  if (eventGeneratorTitle === undefined) return undefined;
  const eventGeneratorTiddler = $tw.wiki.getTiddler(eventGeneratorTitle);
  if (!isEventGenerator(eventGeneratorTiddler?.fields)) {
    return undefined;
  }
  const logTiddlerTitle = eventGeneratorTiddler.fields['reality-event-log'] || getDefaultEventLogTitle(eventGeneratorTitle);
  const logTiddlerType: RealityEventLogTypes = eventGeneratorTiddler.fields['reality-event-log-type'] || (RealityEventLogTypes.Date as RealityEventLogTypes);
  const items = $tw.wiki.getTiddlerData(logTiddlerTitle);
  const tiddlerExists = $tw.wiki.getTiddler(logTiddlerTitle) !== undefined;
  if (!tiddlerExists) {
    // create a new log file if not exist.
    $tw.wiki.addTiddler({ title: logTiddlerTitle, tags: ['$:/Tags/Gamification/RealityEventLog'], type: 'application/x-tiddler-dictionary', text: '', 'hide-body': 'yes' });
  }
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
  } as IRealityEventLogFile;
}

function getDefaultEventLogTitle(tiddlerTitle: string): string {
  return `${tiddlerTitle}/Log`;
}
function isValidLogData(data: ReturnType<typeof $tw.wiki.getTiddlerData>): data is Record<string, string> {
  if (!data || Array.isArray(data)) {
    return false;
  }
  return true;
}
