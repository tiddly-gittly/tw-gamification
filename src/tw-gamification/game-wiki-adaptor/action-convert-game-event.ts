import { IChangedTiddlers } from 'tiddlywiki';

import { IGamificationEvent } from '../event-generator/GamificationEventTypes';
import { GameWidget } from './GameWidgetType';

/**
 * A default event converter for WikiText based games. Can be used as action widget.
 */
class ActionConvertGameEvent extends GameWidget {
  gameInitialized = false;

  refresh(_changedTiddlers: IChangedTiddlers) {
    // noting should trigger game refresh (reloading), because it is self-contained. Game state change is triggered by calling method on wasm.
    return false;
  }

  render(parent: Element, nextSibling: Element) {
    this.parentDomNode = parent;
    this.execute();
  }

  public setGamificationEvents(gamificationEventsJSON: IGamificationEvent[]) {
    if (!this.gameInitialized) {
      // TODO: store gamification events in a tiddler, and push them to game when game is initialized
      throw new Error('Game is not initialized yet!');
    }
  }
}

declare let exports: {
  'action-convert-game-event': typeof ActionConvertGameEvent;
};
exports['action-convert-game-event'] = ActionConvertGameEvent;
