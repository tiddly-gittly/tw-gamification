import { EventGeneratorDefinitions } from '../baseRealityEventGeneratorType';

/**
 * Fields for a filter based event generator. With tag `$:/Tags/Gamification/change-filter`
 *
 * Field start with `reality-event` are come from the `IRealityEvent` interface, by adding a prefix `reality-event` to the field name, and concat with `-`.
 */
export interface IFilterEventGeneratorDefinitions extends EventGeneratorDefinitions {
  /**
   * A valid filter expression that can be used to get the tiddler that will trigger the event.
   * This will be used as a sub-filter concat after the recent changed tiddlers in Tiddlywiki's `'change'` event, deciding if changed tiddler is what we want.
   */
  ['reality-event-trigger-filter']: string;
}
