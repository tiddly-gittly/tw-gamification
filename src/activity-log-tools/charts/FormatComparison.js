"use strict";
const codec = require("../log-file-tools/activityLogCodec");
const types = ["date", "daily-count", "daily-count-rle", "day-interval"];
const {lingo} = require("../utils/lingo");
const names = () => types.map(type => lingo("Format/" + type));
function sizes(events, dayCounts) {
  return types.map(type => new TextEncoder().encode(Object.entries(codec.encode(events, type)).map(([key, value]) => key + ": " + value + "\n").join("") + (type.startsWith("daily-count") || !Object.keys(dayCounts).length ? "" : "activity-log-day-counts: " + JSON.stringify(dayCounts) + "\n")).length);
}
exports.shouldUpdate = function() {return true;};
exports.onUpdate = function(chart, state, attributes) {
  const {type, data, dayCounts} = codec.read($tw.wiki, attributes.logTitle, "daily-count");
  const events = codec.decode(data, type);
  const dateOnlyCounts = type.startsWith("daily-count") ? codec.countDays(events) : dayCounts;
  const bytes = sizes(events, dateOnlyCounts), minimum = Math.min(...bytes);
  const labels = names();
  const scores = [[5,2,4],[2,5,4],[2,3,2],[5,2,2]];
  const descriptions = ["StorageHint", "PrecisionHint", "ReadCostHint", "ReadabilityHint"].map(key => lingo("Chart/" + key));
  const dailyEvents = type.startsWith("daily-count") ? events.length : Object.values(dayCounts).reduce((sum, count) => sum + count, 0);
  chart.setOption({tooltip: {trigger: "axis", axisPointer: {type: "shadow"}, formatter: items => descriptions[items[0].dataIndex] + "<br>" + items.map(item => {
    const calendar = [0, 3].includes(item.seriesIndex)
      ? lingo(dailyEvents ? "Calendar/Converted" : "Calendar/Timed", {count: dailyEvents})
      : lingo("Calendar/AllDay");
    const size = items[0].dataIndex === 0 ? " · " + bytes[item.seriesIndex] + " B" : "";
    return item.marker + item.seriesName + "：" + item.value + size + "<br>" + calendar;
  }).join("<br>")}, legend: {type: "scroll", data: labels}, grid: {left: 12, right: 12, top: 60, bottom: 12, containLabel: true}, xAxis: {type: "value", min: 0, max: 5}, yAxis: {type: "category", data: ["Storage", "Precision", "ReadCost", "Readability"].map(key => lingo("Chart/" + key))}, series: labels.map((name, i) => ({name, type: "bar", data: [bytes[i] ? Number((minimum / bytes[i] * 5).toFixed(1)) : 5, scores[i][0], scores[i][1], scores[i][2]]}))});
};
exports.sizes = sizes;
exports.names = names;
