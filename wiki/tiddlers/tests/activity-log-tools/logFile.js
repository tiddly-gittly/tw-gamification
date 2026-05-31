describe('Activity log file', function() {
  const LOG_TYPE = 'daily-count';

  function getMidnight(dateString) {
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  function formatTwDate(dateString) {
    return $tw.utils.formatDateString(new Date(dateString), '[UTC]YYYY0MM0DD0hh0mm0ss0XXX');
  }

  function createDailyCountLog(title, modified, fields) {
    $tw.wiki.addTiddler({
      title,
      type: 'application/x-tiddler-dictionary',
      'activity-log-type': LOG_TYPE,
      modified: formatTwDate(modified),
      text: Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join('\n'),
    });
  }

  it('should parsed as data tiddler (DailyCount)', function() {
    const log = $tw.wiki.getTiddlerData('ActivityLogDailyCountExample');
    expect(log).toEqual(
      {
        'daily-count1609459200000': '1,0,0,0,3,0,0',
        'daily-count1610064000000': '2,3,4,5,6,7,8',
      },
    );
  });

  it('should fill zero days from tiddler modified date when adding daily-count within 30 days', function() {
    const title = 'ActivityLogDailyCountWriteGapTest';
    const lastDayKey = `daily-count${getMidnight('2026-05-27T09:00:00+08:00')}`;
    const todayKey = `daily-count${getMidnight('2026-05-31T10:00:00+08:00')}`;
    createDailyCountLog(title, '2026-05-27T09:00:00+08:00', {
      [lastDayKey]: '2',
    });

    const { getActivityLog } = require('$:/plugins/linonetwo/activity-log-tools/log-file-tools/getActivityLog');
    const { addActivityToLog } = require('$:/plugins/linonetwo/activity-log-tools/log-file-tools/addActivityToLog');
    const activityLog = getActivityLog(title, LOG_TYPE);
    addActivityToLog(activityLog, new Date('2026-05-31T10:00:00+08:00').getTime());

    expect($tw.wiki.getTiddlerData(title)).toEqual({
      [todayKey]: '2,0,0,0,1',
    });
  });

  it('should remove stale daily-count fields when writing dictionary data', function() {
    const title = 'ActivityLogDailyCountStaleFieldTest';
    const staleKey = `daily-count${getMidnight('2026-05-01T09:00:00+08:00')}`;
    const logKey = `daily-count${getMidnight('2026-05-31T10:00:00+08:00')}`;
    $tw.wiki.addTiddler({
      title,
      type: 'application/x-tiddler-dictionary',
      'activity-log-type': LOG_TYPE,
      modified: formatTwDate('2026-05-31T09:00:00+08:00'),
      [staleKey]: '3',
      text: `${logKey}: 1`,
    });

    const { getActivityLog } = require('$:/plugins/linonetwo/activity-log-tools/log-file-tools/getActivityLog');
    const { addActivityToLog } = require('$:/plugins/linonetwo/activity-log-tools/log-file-tools/addActivityToLog');
    const activityLog = getActivityLog(title, LOG_TYPE);
    addActivityToLog(activityLog, new Date('2026-05-31T10:00:00+08:00').getTime());

    expect($tw.wiki.getTiddler(title).fields[staleKey]).toBeUndefined();
    expect($tw.wiki.getTiddlerData(title)).toEqual({
      [logKey]: '2',
    });
  });

  it('should start a new first row after more than 30 days and keep old daily-count row', function() {
    const title = 'ActivityLogDailyCountWriteNewRowTest';
    const oldKey = `daily-count${getMidnight('2026-04-01T09:00:00+08:00')}`;
    const newKey = `daily-count${getMidnight('2026-05-31T10:00:00+08:00')}`;
    createDailyCountLog(title, '2026-04-01T09:00:00+08:00', {
      [oldKey]: '3',
    });

    const { getActivityLog } = require('$:/plugins/linonetwo/activity-log-tools/log-file-tools/getActivityLog');
    const { addActivityToLog } = require('$:/plugins/linonetwo/activity-log-tools/log-file-tools/addActivityToLog');
    const activityLog = getActivityLog(title, LOG_TYPE);
    addActivityToLog(activityLog, new Date('2026-05-31T10:00:00+08:00').getTime());
    const log = $tw.wiki.getTiddlerData(title);

    expect(Object.keys(log)).toEqual([newKey, oldKey]);
    expect(log).toEqual({
      [newKey]: '1',
      [oldKey]: '3',
    });
  });

  it('should parsed as data tiddler (Date)', function() {
    const log = $tw.wiki.getTiddlerData('ActivityLogDateExample');
    expect(log).toEqual(
      {
        '0': '1609459200000',
        '1': '1609459200001',
        '2': '1609459200002',
        '3': '1609459200003',
        '10': '1609659200000',
        '11': '1609659200001',
        '12': '1609659200002',
        '13': '1609659200003',
      },
    );
  });

  it('should parsed as data tiddler (DayInterval)', function() {
    const dailyCountLog = $tw.wiki.getTiddlerData('ActivityLogDayIntervalExample');
    expect(dailyCountLog).toEqual(
      {
        'day-interval1609459200000': '0.4,0.6,2.4,5.8,4.93,0.94,0.86,0.01,1.49,0.14,0.94,2.18',
        'day-interval1610496000000': '0.4,0.6,2.4,5.8,4.93,0.94,0.86,0.01,1.49,0.14,0.94,2.18',
      },
    );
  });
});
