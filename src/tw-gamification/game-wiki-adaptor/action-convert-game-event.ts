import { IChangedTiddlers, IWidgetEvent, Widget } from 'tiddlywiki';

import { IGamificationEvent } from '../event-generator/GamificationEventTypes';
import { GameWidget } from './GameWidgetType';

/**
 * A default event converter for WikiText based games. Can be used as action widget.
 */
class ActionConvertGameEvent extends GameWidget {
  gameInitialized = false;

  refresh(_changedTiddlers: IChangedTiddlers) {
    return false;
  }

  public setGamificationEvents(gamificationEventsJSON: IGamificationEvent[]) {
    if (!this.gameInitialized) {
      // TODO: store gamification events in a tiddler, and push them to game when game is initialized
      throw new Error('Game is not initialized yet!');
    }
  }

  public invokeAction(triggeringWidget: Widget, event: IWidgetEvent): boolean | undefined {
    // this method is called when triggered by a parrent button widget
    // ask 
    this.popGamificationEvents();
    this.setVariable('createTiddler-title', title);
    this.setVariable('createTiddler-draftTitle', draftTitle);
    this.refreshChildren();
    return true; // Action was invoked
  }
}

declare let exports: {
  'action-convert-game-event': typeof ActionConvertGameEvent;
};
exports['action-convert-game-event'] = ActionConvertGameEvent;
