import { ITiddlerFields } from 'tiddlywiki';
import { IDuplicationStrategy, IFindDuplicateParameters } from '../DuplicationHandlerTypes';
import { BasicGamificationEventTypes } from '../GamificationEventTypes';

/**
 * Fields for a filter based event generator. With tag `$:/Tags/Gamification/change-filter`
 *
 * Field start with `game-event` are come from the `IGamificationEvent` interface, by adding a prefix `game-event` to the field name, and concat with `-`.
 */
export interface IFilterEventGeneratorDefinitions extends ITiddlerFields, IDuplicationStrategy, IFindDuplicateParameters {
  /**
   * The amount of the reward, default to 1. `IGamificationEvent['amount']`
   */
  ['game-event-amount']?: number | string;
  /**
   * Title of the tiddler that contains the item information. `IGamificationEvent['id']`
   */
  ['game-event-id']?: string;
  ['game-event-message']?: string;
  /**
   * A valid filter expression that can be used to get the tiddler that will trigger the event.
   * This will be used as a sub-filter concat after the recent changed tiddlers in Tiddlywiki's `'change'` event, deciding if changed tiddler is what we want.
   */
  ['game-event-trigger-filter']: string;
  /**
   * The type of the event.
   */
  ['game-event-type']: BasicGamificationEventTypes;
}
