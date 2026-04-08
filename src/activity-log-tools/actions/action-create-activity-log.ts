import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { IChangedTiddlers, IWidgetEvent } from 'tiddlywiki';
import { addActivityToLog } from '../log-file-tools/addActivityToLog';
import { createActivityLog } from '../log-file-tools/createActivityLog';
import { getActivityLog } from '../log-file-tools/getActivityLog';
import { LogFileTypes } from '../log-file-types/LogFileTypes';

function toLogFileType(input: string | undefined): LogFileTypes {
  if (input === LogFileTypes.DailyCount) return LogFileTypes.DailyCount;
  if (input === LogFileTypes.DayInterval) return LogFileTypes.DayInterval;
  return LogFileTypes.Date;
}

class ActionCreateActivityLog extends Widget {
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
  overwrite = false;
  addRecord = false;
  timestamp: number | undefined;

  public execute() {
    this.logTitle = this.getAttribute('$logTitle');
    this.logType = toLogFileType(this.getAttribute('$logType'));
    this.overwrite = this.getAttribute('$overwrite') === 'yes';
    this.addRecord = ['yes', 'true'].includes(this.getAttribute('$addRecord') ?? '');
    const attributeTimestamp = this.getAttribute('$timestamp');
    const parsed = attributeTimestamp === undefined ? Number.NaN : Number(attributeTimestamp);
    this.timestamp = Number.isFinite(parsed) ? parsed : undefined;
    super.execute();
  }

  public allowActionPropagation() {
    return false;
  }

  public invokeAction(_triggeringWidget: Widget, _event: IWidgetEvent): boolean | undefined {
    if (!this.logTitle || this.logTitle.trim() === '') return false;
    const logType = this.logType ?? LogFileTypes.Date;
    createActivityLog(logType, { title: this.logTitle }, { overwrite: this.overwrite });
    if (this.addRecord) {
      const activityLog = getActivityLog(this.logTitle, logType);
      addActivityToLog(activityLog, this.timestamp ?? Date.now());
    }
    return true;
  }
}

declare let exports: {
  'action-create-activity-log': typeof ActionCreateActivityLog;
};
exports['action-create-activity-log'] = ActionCreateActivityLog;
