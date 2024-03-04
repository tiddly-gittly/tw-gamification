/* eslint-disable unicorn/no-null */
import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { IChangedTiddlers, IWidgetEvent } from 'tiddlywiki';

/**
 * A default event converter for WikiText based games. Can be used as action widget.
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
  public execute() {
    this.tiddlerTitle = this.getAttribute('$tiddler');
    this.conditionFilter = this.getAttribute('$condition');
    // fallback to 1 if not provided
    const amountNumber = Number(this.getAttribute('$amount'));
    this.amountToConsume = Number.isNaN(amountNumber) ? 1 : amountNumber;
    super.execute();
  }

  public allowActionPropagation() {
    return false;
  }

  public invokeAction(_triggeringWidget: Widget, _event: IWidgetEvent): boolean | undefined {
    // this method is called when triggered by a parent button widget
    if (!this.checkCondition()) return false;
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
    const saveFileNumber = Number(this.wiki.getTiddlerText(this.tiddlerTitle));
    const availableAmount = Number.isNaN(saveFileNumber) ? 0 : saveFileNumber;
    const notEnoughAmount = (availableAmount - this.amountToConsume) < 0;
    if (notEnoughAmount) {
      // if not enough amount (less than 0 after trying to consume), not doing anything
      return false;
    }
    if (this.conditionFilter === undefined || this.conditionFilter === '') {
      // if no condition filter is provided, regard as passed
      return true;
    }
    const result = this.wiki.filterTiddlers(this.conditionFilter, this);
    return result.length > 0;
  }
}

declare let exports: {
  'action-consume-reward-tiddler': typeof ActionConsumeRewardTiddler;
};
exports['action-consume-reward-tiddler'] = ActionConsumeRewardTiddler;
