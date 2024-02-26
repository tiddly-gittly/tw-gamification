import { EventGeneratorDefinitions } from '../baseEventGeneratorType';

/**
 * Fields for a filter based event generator. With tag `$:/Tags/Gamification/change-filter`
 *
 * Field start with `game-event` are come from the `IGamificationEvent` interface, by adding a prefix `game-event` to the field name, and concat with `-`.
 */
export interface IFilterEventGeneratorDefinitions extends EventGeneratorDefinitions {
  /**
   * A valid filter expression that can be used to get the tiddler that will trigger the event.
   * This will be used as a sub-filter concat after the recent changed tiddlers in Tiddlywiki's `'change'` event, deciding if changed tiddler is what we want.
   */
  ['game-event-trigger-filter']: string;
}
