/* eslint-disable unicorn/no-null */
import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { IChangedTiddlers, IWidgetEvent } from 'tiddlywiki';

const notificationTemplateTitle = '$:/plugins/linonetwo/tw-gamification/game-wiki-adaptor/notification/template';

/**
 * A default reward converter for WikiText based games. Can be used as action widget.
 */
class ActionConsumeRewardTiddler extends Widget {
  public refresh(changedTiddlers: IChangedTiddlers) {
    const changedAttributes = this.computeAttributes();
    if ($tw.utils.count(changedAttributes) > 0) {
      this.refreshSelf();
      return true;
    }
    return this.refreshChildren(changedTiddlers);
  }

  public render(parent: Element, nextSibling: Element) {
    this.computeAttributes();
    super.render(parent, nextSibling);
  }

  conditionFilter?: string;
  amountToConsume?: number;
  tiddlerTitle?: string;
  notifyAmountFailed?: string;
  notifyConditionFailed?: string;
  public execute() {
    this.tiddlerTitle = this.getAttribute('$tiddler');
    this.conditionFilter = this.getAttribute('$condition');
    // fallback to 1 if not provided
    const amountNumber = Number(this.getAttribute('$amount'));
    this.amountToConsume = Number.isNaN(amountNumber) ? 1 : amountNumber;
    this.notifyAmountFailed = this.getAttribute('$notify-amount-failed');
    this.notifyConditionFailed = this.getAttribute('$notify-condition-failed');
    super.execute();
  }

  public allowActionPropagation() {
    return false;
  }

  availableAmount = 0;
  public invokeAction(_triggeringWidget: Widget, _event: IWidgetEvent): boolean | undefined {
    // this method is called when triggered by a parent button widget
    const saveFileNumber = Number(this.wiki.getTiddlerText(this.tiddlerTitle ?? ''));
    this.availableAmount = Number.isNaN(saveFileNumber) ? 0 : saveFileNumber;
    if (!this.checkCondition()) return false;
    this.consumeAmount();
    const handled = this.invokeActions(this, null);
    return handled; // Action was invoked
  }

  private checkCondition() {
    if (this.tiddlerTitle === undefined || this.tiddlerTitle === '') {
      // if no tiddler (save file) is provided, not doing anything
      return false;
    }
    if (this.amountToConsume === undefined) {
      // if no amount is provided, not doing anything
      return false;
    }

    const notEnoughAmount = (this.availableAmount - this.amountToConsume) < 0;
    if (notEnoughAmount) {
      // if not enough amount (less than 0 after trying to consume), not doing anything
      if (this.notifyAmountFailed !== undefined) {
        this.dispatchEvent({ type: 'tm-notify', widget: this, param: notificationTemplateTitle, paramObject: { message: this.notifyAmountFailed } });
      }
      return false;
    }
    if (this.conditionFilter === undefined || this.conditionFilter === '') {
      // if no condition filter is provided, regard as passed
      return true;
    }
    const result = this.wiki.filterTiddlers(this.conditionFilter, this);
    const conditionMeet = result.length > 0;
    if (!conditionMeet) {
      // if condition not meet, not doing anything
      if (this.notifyConditionFailed !== undefined) {
        this.dispatchEvent({ type: 'tm-notify', widget: this, param: notificationTemplateTitle, paramObject: { message: this.notifyConditionFailed, condition: result } });
      }
      return false;
    }
    return true;
  }

  private consumeAmount() {
    const newAmount = this.availableAmount - (this.amountToConsume ?? 1);
    if (this.tiddlerTitle === undefined || this.tiddlerTitle === '') {
      return;
    }
    this.wiki.setText(this.tiddlerTitle, 'text', undefined, newAmount.toString());
  }
}

declare let exports: {
  'action-consume-value-tiddler': typeof ActionConsumeRewardTiddler;
};
exports['action-consume-value-tiddler'] = ActionConsumeRewardTiddler;
