import { IGamificationEvent, IGeneratorFindDuplicateStrategy, IGeneratorOnDuplicateStrategy } from './GamificationEventTypes';

export type IAddGamificationEventParameterObject = IAddGamificationEventParameterObjectFromJS | IAddGamificationEventParameterObjectFromActionWidget;
/**
 * When sending events from a js based event generator. This can be used to batch add logs.
 */
export interface IAddGamificationEventParameterObjectFromJS {
  events: IGameEventLogCacheFile;
}
/**
 * A flattened object of `IGameEventLogCacheItem`. Add one event at a time.
 */
export interface IAddGamificationEventParameterObjectFromActionWidget extends IGamificationEvent {
  /**
   * The title of the tiddler that trigger the event, so it is easier to debug. Default to `ActionWidget` which is just a place holder.
   */
  generator?: string;
  ['on-duplicate']?: IGeneratorOnDuplicateStrategy;
  tiddlerTitle: string;
}
/**
 * Each device have a log cache file, text is a JSONstringified Object of this type.
 */
export type IGameEventLogCacheFile = IGameEventLogCacheItem[];
export interface IGameEventLogCacheItem {
  event: IGamificationEvent;
  /**
   * Strategy to run to find potential duplicates.
   */
  ['find-duplicate']?: IGeneratorFindDuplicateStrategy;
  /**
   * Title of the event generator tiddler.
   */
  generator: string;
  /**
   * Strategy to run when we find a duplicate item.
   */
  ['on-duplicate']?: IGeneratorOnDuplicateStrategy;
  /**
   * Can be a simple hash of `event` or a public/private key based signature of `event`, to prevent manual edit of it by user.
   */
  signature?: string;
  /**
   * Title that triggers the event.
   * If the event is triggered twice by the same tiddler, then this may be ignored based on `IGeneratorDuplicateStrategy`.
   */
  tiddlerTitle: string;
}
