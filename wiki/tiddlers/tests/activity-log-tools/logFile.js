describe('Activity log file', function() {
  it('should parsed as data tiddler (DailyCount)', function() {
    const log = $tw.wiki.getTiddlerData('ActivityLogDailyCountExample');
    expect(log).toEqual(
      {
        'daily-count1609459200000': '1,0,0,0,3,0,0',
        'daily-count1610064000000': '2,3,4,5,6,7,8',
      },
    );
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
