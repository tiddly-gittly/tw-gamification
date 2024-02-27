/* eslint-disable unicorn/no-null */
import { IChangedTiddlers, IWidgetEvent, Widget } from 'tiddlywiki';

import { BasicGamificationEventTypes, IGamificationEvent } from '../event-generator/GamificationEventTypes';
import { GameWidget } from './GameWidgetType';

/**
 * A default event converter for WikiText based games. Can be used as action widget.
 */
class ActionConvertGameEvent extends GameWidget {
  public refresh(changedTiddlers: IChangedTiddlers) {
    const changedAttributes = this.computeAttributes();
    if ($tw.utils.count(changedAttributes) > 0) {
      this.refreshSelf();
      return true;
    }
    return this.refreshChildren(changedTiddlers);
  }

  eventTypes: BasicGamificationEventTypes[] | undefined;

  public render(parent: Element, nextSibling: Element) {
    this.computeAttributes();
    super.render(parent, nextSibling);
  }

  public execute() {
    this.eventTypes = this.getAttribute('$eventTypes')?.split?.(' ') as BasicGamificationEventTypes[];
    super.execute();
  }

  public invokeAction(_triggeringWidget: Widget, _event: IWidgetEvent): boolean | undefined {
    // this method is called when triggered by a parent button widget
    // ask provider to pop events and send to this widget's `setGamificationEvents` method, then call `invokeActions` to invoke child action widgets later.
    this.popGamificationEvents(this.eventTypes);
    return true; // Action was invoked
  }

  public setGamificationEvents(gamificationEventsJSON: IGamificationEvent[]) {
    // this method is called by provider when events are popped, and only events type that is in `eventTypes` will be sent here.
    this.setVariable('gameEvents', JSON.stringify(gamificationEventsJSON));
    // this can only trigger direct descendants, so anything needs to calculate or filtered need to be done in inline filter expression in transclusion. (But can create custom filter operators to simplify this.)
    const handled = this.invokeActions(this, null);
    return handled;
  }
}

declare let exports: {
  'action-convert-game-event': typeof ActionConvertGameEvent;
};
exports['action-convert-game-event'] = ActionConvertGameEvent;
