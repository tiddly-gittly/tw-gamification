import { IDuplicationStrategy, IFindDuplicateParameters } from '../event-generator/DuplicationHandlerTypes';
import { IGamificationEvent } from '../event-generator/GamificationEventTypes';

export type IAddGamificationEventParameterObject = IAddGamificationEventParameterObjectFromJS | IAddGamificationEventParameterObjectFromActionWidget;
export type IAddGamificationEventParameterObjectFromJSEventItem = IGameEventLogCacheItem & IDuplicationStrategy & IFindDuplicateParameters;
/**
 * When sending events from a js based event generator. This can be used to batch add logs.
 */
export interface IAddGamificationEventParameterObjectFromJS {
  events: IAddGamificationEventParameterObjectFromJSEventItem[];
}
/**
 * A flattened object of `IGameEventLogCacheItem`. Add one event at a time.
 */
export interface IAddGamificationEventParameterObjectFromActionWidget extends IGamificationEvent, IDuplicationStrategy, IFindDuplicateParameters {
  /**
   * The title of the tiddler that trigger the event, so it is easier to debug. Default to `ActionWidget` which is just a place holder.
   */
  generator?: string;
  tiddlerTitle: string;
}
/**
 * Each device have a log cache file, text is a JSONstringified Object of this type.
 */
export type IGameEventLogCacheFile = IGameEventLogCacheItem[];
export interface IGameEventLogCacheItem {
  event: IGamificationEvent;
  meta: {
    /**
     * Title of the event generator tiddler.
     */
    generator: string;
    /**
     * Can be a simple hash of `event` or a public/private key based signature of `event`, to prevent manual edit of it by user.
     */
    signature?: string;
    /**
     * Title that triggers the event.
     * If the event is triggered twice by the same tiddler, then this may be ignored based on `IGeneratorDuplicateStrategy`.
     */
    tiddlerTitle?: string;
  };
}
