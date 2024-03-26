import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { IRealityEventCacheCacheFile } from '../reality-event-cache/RealityEventCacheTypes';
import { BasicRealityEventTypes } from '../reality-event-generator/reality-event-types/RealityEventTypes';

export abstract class GameWidget extends Widget {
  public readonly isGameWidget = true;
  /**
   * Callback method. You will get game event that needs to be consumed by the game from param.
   * You should implement this method, and transform received events to in-game events and send them to the game.
   * @return handled - return true if the event is handled, and we will safely remove handled events from the cache; false if not handled, we will keep the cache untouched for next try.
   */
  public abstract setRealityEvents(gamificationEventsJSON: IRealityEventCacheCacheFile): boolean | Promise<boolean>;
  /**
   * Trigger event dequeue, event tiddlers will be cleared, and events will be sent to game widget by calling `setRealityEvents` method on the game widget that triggers `popRealityEvents`.
   */
  protected popRealityEvents(eventTypes: BasicRealityEventTypes[] | undefined) {
    this.dispatchEvent({ type: 'pop-reality-events', eventTypes, widget: this });
  }
}

export const isGameWidget = (widget: Widget): widget is GameWidget => {
  return (widget as GameWidget).isGameWidget;
};
