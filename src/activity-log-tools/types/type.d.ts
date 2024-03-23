declare module '$:/plugins/linonetwo/activity-log-tools/log-file-tools/addActivityToLog' {
  import { IActivityLogFile } from 'src/activity-log-tools/log-file-types/LogFileTypes';
  export declare function addActivityToLog(activityLog: IActivityLogFile | undefined, newActivityTimestamp: number): void;
}

declare module '$:/plugins/linonetwo/activity-log-tools/log-file-tools/checkActivityLog' {
  export declare function isValidActivityLogData(data: ReturnType<typeof $tw.wiki.getTiddlerData>): data is Record<string, string>;
}

declare module '$:/plugins/linonetwo/activity-log-tools/log-file-tools/createActivityLog' {
  import { ITiddlerFields } from 'tiddlywiki';
  import { LogFileTypes } from 'src/activity-log-tools/log-file-types/LogFileTypes';
  export declare function createActivityLog(logTiddlerType: LogFileTypes, fields: Partial<ITiddlerFields> & Pick<ITiddlerFields, 'title'>, options?: {
    overwrite?: boolean;
  }): void;
}

declare module '$:/plugins/linonetwo/activity-log-tools/log-file-tools/getActivityLog' {
  import { IActivityLogFile, LogFileTypes } from 'src/activity-log-tools/log-file-types/LogFileTypes';
  export declare function getActivityLog(logTiddlerTitle: string, logTiddlerType: LogFileTypes): IActivityLogFile | undefined;
}
