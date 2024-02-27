/* eslint-disable unicorn/no-null */
import { IChangedTiddlers, IWidgetEvent, Widget } from 'tiddlywiki';

import { BasicGamificationEventTypes, IGamificationEvent } from '../event-generator/GamificationEventTypes';
import { GameWidget } from './GameWidgetType';

/**
 * A default event converter for WikiText based games. Can be used as action widget.
 */
class ActionConvertGameEvent extends GameWidget {
  refresh(_changedTiddlers: IChangedTiddlers) {
    return false;
  }

  eventTypes: BasicGamificationEventTypes[] | undefined;

  public execute() {
    super.execute();
    this.eventTypes = this.getAttribute('eventTypes')?.split?.(' ') as BasicGamificationEventTypes[];
  }

  public invokeAction(_triggeringWidget: Widget, _event: IWidgetEvent): boolean | undefined {
    // this method is called when triggered by a parrent button widget
    // ask provider to pop events and send to this widget's `setGamificationEvents` method
    this.popGamificationEvents(this.eventTypes);
    return true; // Action was invoked
  }

  public setGamificationEvents(gamificationEventsJSON: IGamificationEvent[]) {
    // this method is called by provider when events are popped, and only events type that is in `eventTypes` will be sent here.
    // TODO: serialize the array to the format that can be used by filter expression
    this.setVariable('gameEvents', JSON.stringify(gamificationEventsJSON));
    const handled = this.invokeActions(this, null);
    return handled;
  }
}

declare let exports: {
  'action-convert-game-event': typeof ActionConvertGameEvent;
};
exports['action-convert-game-event'] = ActionConvertGameEvent;
