import { IGamificationEvent, IGeneratorDuplicateStrategy } from './GamificationEventTypes';

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
  ['on-duplicate']?: IGeneratorDuplicateStrategy;
  tiddlerTitle: string;
}
/**
 * Each device have a log cache file, text is a JSONstringified Object of this type.
 */
export type IGameEventLogCacheFile = IGameEventLogCacheItem[];
export interface IGameEventLogCacheItem {
  event: IGamificationEvent;
  ['on-duplicate']?: IGeneratorDuplicateStrategy;
  /**
   * Can be a simple hash of `event` or a public/private key based signature of `event`, to prevent manual edit of it by user.
   */
  signature?: string;
  /**
   * Title that triggers the event.
   * If the event is triggered twice by the same tiddler, then this will be ignored.
   */
  tiddlerTitle: string;
}
