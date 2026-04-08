import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { IChangedTiddlers, IWidgetEvent } from 'tiddlywiki';
import { addActivityToLog } from '../log-file-tools/addActivityToLog';
import { getActivityLog } from '../log-file-tools/getActivityLog';
import { LogFileTypes } from '../log-file-types/LogFileTypes';

function toLogFileType(input: string | undefined): LogFileTypes {
  if (input === LogFileTypes.DailyCount) return LogFileTypes.DailyCount;
  if (input === LogFileTypes.DayInterval) return LogFileTypes.DayInterval;
  return LogFileTypes.Date;
}

class ActionAddActivityToLog extends Widget {
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

  logTitle?: string;
  logType?: LogFileTypes;
  timestamp?: number;

  public execute() {
    this.logTitle = this.getAttribute('$logTitle');
    this.logType = toLogFileType(this.getAttribute('$logType'));

    const attributeTimestamp = this.getAttribute('$timestamp');
    const parsedTimestamp = attributeTimestamp === undefined ? Number.NaN : Number(attributeTimestamp);
    this.timestamp = Number.isFinite(parsedTimestamp) ? parsedTimestamp : undefined;
    super.execute();
  }

  public allowActionPropagation() {
    return false;
  }

  public invokeAction(_triggeringWidget: Widget, _event: IWidgetEvent): boolean | undefined {
    if (!this.logTitle || this.logTitle.trim() === '') return false;
    const logType = this.logType ?? LogFileTypes.Date;
    const activityLog = getActivityLog(this.logTitle, logType);
    addActivityToLog(activityLog, this.timestamp ?? Date.now());
    return true;
  }
}

declare let exports: {
  'action-add-activity-to-log': typeof ActionAddActivityToLog;
};
exports['action-add-activity-to-log'] = ActionAddActivityToLog;
