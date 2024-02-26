import { ITiddlerFields } from 'tiddlywiki';
import { IDuplicationStrategy, IFindDuplicateParameters } from './DuplicationHandlerTypes';
import { BasicGamificationEventTypes } from './GamificationEventTypes';

export interface EventGeneratorDefinitions extends ITiddlerFields, IDuplicationStrategy, IFindDuplicateParameters {
  /**
   * The amount of the reward, default to 1. `IGamificationEvent['amount']`
   */
  ['game-event-amount']?: number | string;
  /**
   * Title of the tiddler that contains the item information. `IGamificationEvent['id']`
   */
  ['game-event-item']?: string;
  ['game-event-message']?: string;
  /**
   * The type of the event.
   */
  ['game-event-type']: BasicGamificationEventTypes;
}
