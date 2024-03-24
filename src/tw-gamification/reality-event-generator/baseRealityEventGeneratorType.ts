import { IActivityLogTiddlerFields } from 'src/activity-log-tools/log-file-types/LogFileTypes';
import { ITiddlerFields } from 'tiddlywiki';
import { IDuplicationStrategy, IFindDuplicateParameters } from './deduplication/DuplicationHandlerTypes';
import { BasicRealityEventTypes } from './reality-event-types/RealityEventTypes';

export interface EventGeneratorDefinitions extends Pick<IActivityLogTiddlerFields, 'activity-log-file-type'>, ITiddlerFields, IDuplicationStrategy, IFindDuplicateParameters {
  /**
   * The amount of the reward, default to 1. `IRealityEvent['amount']`
   */
  ['reality-event-amount']?: number | string;
  /**
   * Title of the tiddler that contains the item information. `IRealityEvent['id']`
   */
  ['reality-event-item']?: string;
  /**
   * Title of a tiddler with tag `$:/Tags/Gamification/RealityEventLog`. See `RealityEventLogTypes` for details.
   */
  ['reality-event-log']: string;
  ['reality-event-message']?: string;
  /**
   * The type of the event.
   */
  ['reality-event-type']: BasicRealityEventTypes;
}

export function isEventGenerator(tiddlerFields: ITiddlerFields | undefined): tiddlerFields is EventGeneratorDefinitions {
  return tiddlerFields !== undefined && 'reality-event-type' in tiddlerFields && Boolean(tiddlerFields['reality-event-type']);
}
