import { ITiddlerFields } from 'tiddlywiki';
import { IDuplicationStrategy, IFindDuplicateParameters } from './DuplicationHandlerTypes';
import { BasicRealityEventTypes } from './RealityEventTypes';

export interface EventGeneratorDefinitions extends ITiddlerFields, IDuplicationStrategy, IFindDuplicateParameters {
  /**
   * The amount of the reward, default to 1. `IRealityEvent['amount']`
   */
  ['reality-event-amount']?: number | string;
  /**
   * Title of the tiddler that contains the item information. `IRealityEvent['id']`
   */
  ['reality-event-item']?: string;
  ['reality-event-message']?: string;
  /**
   * The type of the event.
   */
  ['reality-event-type']: BasicRealityEventTypes;
}
