import { EventGeneratorDefinitions } from '../baseEventGeneratorType';

/**
 * Fields for a filter based event generator. With tag `$:/Tags/Gamification/change-filter`
 *
 * Field start with `game-event` are come from the `IGamificationEvent` interface, by adding a prefix `game-event` to the field name, and concat with `-`.
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
