"use strict";
const {inRange, hasInRange} = require("../log-file-tools/activityRange");
const {dayKey} = require("../log-file-tools/activityLogCodec");

exports.activityevents = function(source, operator, options) {
  const result = [];
  const [start, end] = operator.operands;
  source((tiddler, title) => {
    if (!tiddler?.fields["activity-log-type"]) return;
    if (operator.suffix === "titles") {
      if (hasInRange(options.wiki, title, start, end)) result.push(title);
      return;
    }
    const events = inRange(options.wiki, title, start, end);
    for (const {time, count, allDay, index} of events) {
      const timestamp = $tw.utils.stringifyDate(new Date(time));
      if (operator.suffix === "timestamps") result.push(timestamp);
      else result.push(JSON.stringify({
        id: title + "/" + index,
        title,
        timestamp,
        start: allDay ? dayKey(time) : new Date(time).toISOString(),
        allDay,
        editable: false,
        startEditable: false,
        durationEditable: false,
        extendedProps: {activityLog: true, activityCount: count, activityLabel: tiddler.fields.caption || title}
      }));
    }
  });
  return result;
};
