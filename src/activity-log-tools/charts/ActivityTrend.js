"use strict";
const codec = require("../log-file-tools/activityLogCodec");
const {inRange} = require("../log-file-tools/activityRange");
exports.shouldUpdate = function() { return true; };
exports.onUpdate = function(chart, state, attributes) {
  const title = attributes.logTitle;
  const days = [], counts = [], daily = new Map();
  if ($tw.wiki.getTiddler(title)) inRange($tw.wiki, title).forEach(({time, count}) => {const day = codec.dayKey(time); daily.set(day, (daily.get(day) || 0) + count);});
  for (let i = 27; i >= 0; i--) {const day = new Date(); day.setDate(day.getDate() - i); const key = codec.dayKey(day); days.push(key); counts.push(daily.get(key) || 0);}
  const mini = attributes.mini === "yes";
  chart.setOption({tooltip: {trigger: "axis"}, grid: mini ? {left: 2, right: 2, top: 4, bottom: 4} : {left: 36, right: 12, top: 16, bottom: 36, containLabel: true}, xAxis: {type: "category", data: days, show: !mini, boundaryGap: false}, yAxis: {type: "value", show: !mini, minInterval: 1}, series: [{type: "line", smooth: false, data: counts, symbol: "circle", symbolSize: mini ? 5 : 8, areaStyle: {opacity: .3}}]});
};
