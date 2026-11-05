"use strict";
const codec = require("./activityLogCodec");

function indexLog(wiki, title) {
  return wiki.getCacheForTiddler(title, "activity-log-events", () => {
    const {type, data, dayCounts} = codec.read(wiki, title);
    const counts = new Map(), timed = [];
    const addDay = (time, count) => {
      const day = new Date(time); day.setHours(0, 0, 0, 0);
      counts.set(day.getTime(), (counts.get(day.getTime()) || 0) + count);
    };
    if (type === "daily-count" || type === "daily-count-rle") {
      for (const [key, value] of Object.entries(data)) {
        const runs = String(value).split(",").map(token => {
          const [count, length = 1] = token.split("*").map(Number);
          return {count, length};
        });
        const day = new Date(Number(key.slice(type.length)));
        day.setDate(day.getDate() - runs.reduce((total, run) => total + run.length, 0) + 1);
        for (const run of runs) {
          if (run.count) {
            for (let i = 0; i < run.length; i++) {
              addDay(day.getTime(), run.count);
              day.setDate(day.getDate() + 1);
            }
          } else day.setDate(day.getDate() + run.length);
        }
      }
    } else {
      const times = codec.decode(data, type);
      for (const time of times) {
        const day = codec.dayKey(time);
        if (dayCounts[day] > 0 && time === codec.localDate(day).getTime()) {
          addDay(time, 1); dayCounts[day]--;
        } else timed.push({time, count: 1, allDay: false});
      }
    }
    return [...timed, ...[...counts].map(([time, count]) => ({time, count, allDay: true}))].sort((a, b) => a.time - b.time);
  });
}
function boundary(value, fallback) {
  if (!value) return fallback;
  if (/^\d{8}(?:\d{6}(?:\d{3})?)?$/.test(value)) return $tw.utils.parseDate(value).getTime();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = codec.localDate(value); date.setHours(0, 0, 0, 0);
    return date.getTime();
  }
  return new Date(value).getTime();
}
function lowerBound(events, time) {
  let low = 0, high = events.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (events[mid].time < time) low = mid + 1;
    else high = mid;
  }
  return low;
}
function findRange(wiki, title, start, end) {
  const events = indexLog(wiki, title);
  const from = boundary(start, -Infinity);
  const to = boundary(end, Infinity);
  if (to <= from) return {events, first: 0, last: 0, from};
  // Daily entries overlap any range touching their day; timed entries must fall inside it.
  let dayStart = from;
  if (Number.isFinite(from)) {const date = new Date(from); date.setHours(0, 0, 0, 0); dayStart = date.getTime();}
  return {events, first: lowerBound(events, dayStart), last: lowerBound(events, to), from};
}
exports.hasInRange = function(wiki, title, start, end) {
  const {events, first, last, from} = findRange(wiki, title, start, end);
  for (let i = first; i < last; i++) if (events[i].allDay || events[i].time >= from) return true;
  return false;
};
exports.inRange = function(wiki, title, start, end) {
  const {events, first, last, from} = findRange(wiki, title, start, end);
  return events.slice(first, last).map((event, index) => ({...event, index: first + index})).filter(event => event.allDay || event.time >= from);
};
