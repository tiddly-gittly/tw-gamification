describe('activitydaycounts filter', function() {
  // Test filter parsing
  it('should parse daily count log tiddler', function() {
    const dailyCountLog = $tw.wiki.getTiddlerData('ActivityLogDailyCountExample');
    expect(dailyCountLog).toEqual(
      {
        'daily-count1609459200000': '1,0,0,0,3,0,0',
        'daily-count1610064000000': '2,3,4,5,6,7,8',
      },
    );
  });
});
