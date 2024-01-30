import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { IGamificationEvent } from '../event-generator/GamificationEventTypes';

export abstract class GameWidget extends Widget {
  public readonly isGameWidget = true;
  /**
   * Get game event that needs to be consumed by the game.
   * You should transform these events to in-game events and send them to the game.
   */
  public abstract setGamificationEvents(gamificationEventsJSON: IGamificationEvent[]): void | Promise<void>;
  /**
   * Trigger event dequeue, event tiddlers will be cleared, and events will be sent to game widget by calling `setGamificationEvents` method on the game widget that triggers `popGamificationEvents`.
   */
  protected popGamificationEvents() {
    this.dispatchEvent({ type: 'pop-gamification-events', widget: this });
  }
}

export const isGameWidget = (widget: Widget): widget is GameWidget => {
  return (widget as GameWidget).isGameWidget;
};
