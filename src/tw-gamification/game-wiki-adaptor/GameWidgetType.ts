import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { BasicGamificationEventTypes, IGamificationEvent } from '../event-generator/GamificationEventTypes';

export abstract class GameWidget extends Widget {
  public readonly isGameWidget = true;
  /**
   * Callback method. You will get game event that needs to be consumed by the game from param.
   * You should implement this method, and transform received events to in-game events and send them to the game.
   * @return handled - return true if the event is handled, and we will safely remove handled events from the cache; false if not handled, we will keep the cache untouched for next try.
   */
  public abstract setGamificationEvents(gamificationEventsJSON: IGamificationEvent[]): boolean | Promise<boolean>;
  /**
   * Trigger event dequeue, event tiddlers will be cleared, and events will be sent to game widget by calling `setGamificationEvents` method on the game widget that triggers `popGamificationEvents`.
   */
  protected popGamificationEvents(eventTypes: BasicGamificationEventTypes[] | undefined) {
    this.dispatchEvent({ type: 'pop-gamification-events', eventTypes, widget: this });
  }
}

export const isGameWidget = (widget: Widget): widget is GameWidget => {
  return (widget as GameWidget).isGameWidget;
};
