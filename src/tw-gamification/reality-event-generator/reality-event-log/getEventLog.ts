/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { isEventGenerator } from '../baseRealityEventGeneratorType';
import { IRealityEventLogFile, RealityEventLogTypes } from './RealityEventLogTypes';

/**
 * @returns Event log or undefined, undefined means no need to consider event log, for example, one-time event triggered in tutorial.
 */
export function getEventLog(eventGeneratorTitle: string | undefined): IRealityEventLogFile | undefined {
  if (eventGeneratorTitle === undefined) return undefined;
  const eventGeneratorTiddler = $tw.wiki.getTiddler(eventGeneratorTitle);
  if (!isEventGenerator(eventGeneratorTiddler?.fields)) {
    return undefined;
  }
  const logTiddlerTitle = eventGeneratorTiddler.fields['reality-event-log'] || getDefaultEventLogTitle(eventGeneratorTitle);
  const logTiddlerType = eventGeneratorTiddler.fields['reality-event-log-type'] || RealityEventLogTypes.Date;
  const items = $tw.wiki.getTiddlerData(logTiddlerTitle);
  if (!isValidLogData(items)) {
    // return empty one with default type
    return {
      type: logTiddlerType,
      items: {},
      exists: false,
    };
  }
  return {
    type: logTiddlerType,
    items,
    exists: true,
  };
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
