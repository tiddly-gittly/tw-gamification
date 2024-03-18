import { IDuplicationStrategy, IFindDuplicateParameters } from '../reality-event-generator/DuplicationHandlerTypes';
import { IRealityEvent } from '../reality-event-generator/RealityEventTypes';

export type IAddRealityEventParameterObject = IAddRealityEventParameterObjectFromJS | IAddRealityEventParameterObjectFromActionWidget;
export type IAddRealityEventParameterObjectFromJSEventItem = IRealityEventCacheCacheItem & { configs: IDuplicationStrategy & IFindDuplicateParameters };
/**
 * When sending events from a js based event generator. This can be used to batch add logs.
 */
export interface IAddRealityEventParameterObjectFromJS {
  events: IAddRealityEventParameterObjectFromJSEventItem[];
}
/**
 * A flattened object of `IRealityEventCacheCacheItem`. Add one event at a time.
 */
export interface IAddRealityEventParameterObjectFromActionWidget extends IRealityEvent {
  configs: IDuplicationStrategy & IFindDuplicateParameters;
  /**
   * The title of the tiddler that trigger the event, so it is easier to debug. Default to `ActionWidget` which is just a place holder.
   */
  generator?: string;
  tiddlerTitle: string;
}
/**
 * Each device have a event cache file, text is a JSONstringified Object of this type.
 * "Cache" means it will be deleted when processed, for example, when the event is used by the game.
 */
export type IRealityEventCacheCacheFile = IRealityEventCacheCacheItem[];
export interface IRealityEventCacheCacheItem {
  event: IRealityEvent;
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
