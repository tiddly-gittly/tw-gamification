declare module '$:/plugins/linonetwo/activity-log-tools/log-file-tools/addActivityToLog' {
  import type { IActivityLogFile } from '../log-file-types/LogFileTypes';
  export declare function addActivityToLog(activityLog: IActivityLogFile | undefined, newActivityTimestamp: number): void;
}

declare module '$:/plugins/linonetwo/activity-log-tools/log-file-tools/checkActivityLog' {
  export declare function isValidActivityLogData(data: ReturnType<typeof $tw.wiki.getTiddlerData>): data is Record<string, string>;
}

declare module '$:/plugins/linonetwo/activity-log-tools/log-file-tools/getActivityLog' {
  import { IActivityLogFile, LogFileTypes } from 'src/activity-log-tools/log-file-types/LogFileTypes';
  export declare function getActivityLog(logTiddlerType: LogFileTypes, logTiddlerTitle: string): IActivityLogFile | undefined;
}