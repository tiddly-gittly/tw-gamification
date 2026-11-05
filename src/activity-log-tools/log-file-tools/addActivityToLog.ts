import { createActivityLog } from '$:/plugins/linonetwo/activity-log-tools/log-file-tools/createActivityLog';
import { IActivityLogFile } from '../log-file-types/LogFileTypes';
const codec = require('./activityLogCodec');

/** Decode, insert in chronological order, then encode in the stored format. */
export function addActivityToLog(activityLog: IActivityLogFile | undefined, timestamp: number) {
  if (!activityLog || !Number.isFinite(timestamp) || timestamp <= 0) return;
  const stored = $tw.wiki.getTiddler(activityLog.title);
  const type = stored?.fields['activity-log-type'] || activityLog.type;
  const events = codec.decode(Object.fromEntries(activityLog.items), type);
  events.push(timestamp);
  const data = codec.encode(events, type);
  createActivityLog(type, {title: activityLog.title});
  codec.save($tw.wiki, activityLog.title, type, data);
  activityLog.items = new Map(Object.entries(data)) as IActivityLogFile['items'];
}
