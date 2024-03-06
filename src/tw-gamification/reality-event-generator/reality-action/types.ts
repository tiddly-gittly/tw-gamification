import { EventGeneratorDefinitions } from '../baseRealityEventGeneratorType';

/**
 * Fields for a filter based event generator. With tag `$:/Tags/Gamification/ChangeFilter`
 *
 * Field start with `reality-event` are come from the `IRealityEvent` interface, by adding a prefix `reality-event` to the field name, and concat with `-`.
 */
export interface IActionDefinitions extends EventGeneratorDefinitions {
  caption: string;
  description: string;
  icon: string;
}

export interface IActionExtraParameterObject {
  /**
   * The tiddler that trigger the event (that contains the action button). Used for deduplication (See `IDuplicationStrategy`).
   */
  from?: string;
}
