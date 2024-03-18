/* eslint-disable unicorn/no-null */
import { IChangedTiddlers, IWidgetEvent, Widget } from 'tiddlywiki';

import { BasicRealityEventTypes, IRealityEvent } from '../../reality-event-generator/reality-event-types/RealityEventTypes';
import { GameWidget } from '../GameWidgetType';

/**
 * A default reality event converter for WikiText based games. Can be used as action widget.
 */
class ActionConvertRealityEvent extends GameWidget {
  public refresh(changedTiddlers: IChangedTiddlers) {
    const changedAttributes = this.computeAttributes();
    if ($tw.utils.count(changedAttributes) > 0) {
      this.refreshSelf();
      return true;
    }
    return this.refreshChildren(changedTiddlers);
  }

  eventTypes: BasicRealityEventTypes[] | undefined;

  public render(parent: Element, nextSibling: Element) {
    this.computeAttributes();
    super.render(parent, nextSibling);
  }

  public execute() {
    this.eventTypes = this.getAttribute('$eventTypes')?.split?.(' ') as BasicRealityEventTypes[];
    super.execute();
  }

  public invokeAction(_triggeringWidget: Widget, _event: IWidgetEvent): boolean | undefined {
    // this method is called when triggered by a parent button widget
    // ask provider to pop events and send to this widget's `setRealityEvents` method, then call `invokeActions` to invoke child action widgets later.
    this.popRealityEvents(this.eventTypes);
    return true; // Action was invoked
  }

  public allowActionPropagation() {
    return false;
  }

  public setRealityEvents(gamificationEventsJSON: IRealityEvent[]) {
    // this method is called by provider when events are popped, and only events type that is in `eventTypes` will be sent here.
    this.setVariable('realityEvents', JSON.stringify(gamificationEventsJSON));
    // this can only trigger direct descendants, so anything needs to calculate or filtered need to be done in inline filter expression in transclusion. (But can create custom filter operators to simplify this.)
    const handled = this.invokeActions(this, null);
    return handled;
  }
}

declare let exports: {
  'action-convert-reality-event': typeof ActionConvertRealityEvent;
};
exports['action-convert-reality-event'] = ActionConvertRealityEvent;
