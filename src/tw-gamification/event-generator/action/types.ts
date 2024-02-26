import { ITiddlerFields } from 'tiddlywiki';
import { IDuplicationStrategy, IFindDuplicateParameters } from '../DuplicationHandlerTypes';
import { BasicGamificationEventTypes } from '../GamificationEventTypes';

/**
 * Fields for a filter based event generator. With tag `$:/Tags/Gamification/change-filter`
 *
 * Field start with `game-event` are come from the `IGamificationEvent` interface, by adding a prefix `game-event` to the field name, and concat with `-`.
 */
export interface IActionDefinitions extends ITiddlerFields, IDuplicationStrategy, IFindDuplicateParameters {
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

export interface IActionExtraParameterObject {
  /**
   * The tiddler that trigger the event (that contains the action button). Used for deduplication (See `IDuplicationStrategy`).
   */
  from?: string;
}
