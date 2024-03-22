describe('activitydaycounts filter', function() {
  // Test filter parsing
  it('should return empty string if no date range given', function() {
    expect($tw.wiki.filterTiddlers('[[ActivityLogDailyCountExample]] +[activitydaycounts[]]')).toEqual(['']);
  });
  describe('DailyCount log file', function() {
    const startDateString = $tw.utils.formatDateString(new Date(1_609_459_200_000), '[UTC]YYYY0MM0DD0hh0mm0ss0XXX');
    const endDateString = $tw.utils.formatDateString(new Date(new Date(1_610_064_000_000).setDate(14)), '[UTC]YYYY0MM0DD0hh0mm0ss0XXX');

    it('should parse daily count log tiddler', function() {
      expect($tw.wiki.filterTiddlers(`[[ActivityLogDailyCountExample]] +[activitydaycounts[${startDateString}],[${endDateString}]]`).join(',')).toBe(
        '1,0,0,0,3,0,0,2,3,4,5,6,7,8',
      );
    });
  });
});
