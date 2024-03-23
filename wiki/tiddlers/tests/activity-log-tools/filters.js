describe('activitydaycounts filter', function() {
  // Test filter parsing
  it('should return empty string if no date range given', function() {
    expect($tw.wiki.filterTiddlers('[[ActivityLogDailyCountExample]] +[activitydaycounts[]]')).toEqual(['']);
    expect($tw.wiki.filterTiddlers('[[ActivityLogDateExample]] +[activitydaycounts[]]')).toEqual(['']);
    expect($tw.wiki.filterTiddlers('[[ActivityLogDayIntervalExample]] +[activitydaycounts[]]')).toEqual(['']);
  });
  describe('DailyCount log file', function() {
    // each example tiddler have different data, so we construct start end based on content of example log tiddler.
    const startDateString = $tw.utils.formatDateString(new Date(1_609_459_200_000), '[UTC]YYYY0MM0DD0hh0mm0ss0XXX');
    const endDateString = $tw.utils.formatDateString(new Date(new Date(1_610_064_000_000).setDate(14)), '[UTC]YYYY0MM0DD0hh0mm0ss0XXX');

    it('should parse daily count log tiddler', function() {
      expect($tw.wiki.filterTiddlers(`[[ActivityLogDailyCountExample]] +[activitydaycounts[${startDateString}],[${endDateString}]]`).join(',')).toBe(
        '1,0,0,0,3,0,0,2,3,4,5,6,7,8',
      );
    });
  });

  describe('Date log file', function() {
    const startDateString = $tw.utils.formatDateString(new Date(1_609_459_200_000), '[UTC]YYYY0MM0DD0hh0mm0ss0XXX');
    // the example ends with 1609559200003, but we count till 1609559200002 to test if filter works
    const endDateString = $tw.utils.formatDateString(new Date(1_609_659_200_002), '[UTC]YYYY0MM0DD0hh0mm0ss0XXX');

    it('should parse daily count log tiddler', function() {
      expect($tw.wiki.filterTiddlers(`[[ActivityLogDateExample]] +[activitydaycounts[${startDateString}],[${endDateString}]]`).join(',')).toBe(
        '4,0,3',
      );
    });
  });

  describe('DayInterval log file', function() {
    // started at 1607616000000 (December 11, 2020) (calculated by chatGPT)
    const startDateString = $tw.utils.formatDateString(new Date(1_607_616_000_000), '[UTC]YYYY0MM0DD0hh0mm0ss0XXX');
    // the example ends with 1610496000000 (13th), but we count till 1610236800000 (10th) to test if filter works
    const endDateString = $tw.utils.formatDateString(new Date(1_609_659_200_002), '[UTC]YYYY0MM0DD0hh0mm0ss0XXX');

    it('should parse daily count log tiddler', function() {
      expect($tw.wiki.filterTiddlers(`[[ActivityLogDayIntervalExample]] +[activitydaycounts[${startDateString}],[${endDateString}]]`).join(',')).toBe(
        '0,2,0,1,0,0,1,0,0,0,0,0,0,1,0,0,0,2,0,1,0,1,0,2,0,2,0,2,0,1,0,0,0,1,0,0',
      );
    });
  });
});
