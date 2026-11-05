"use strict";
const undo = require('../log-file-tools/conversionUndo');
exports.activitylogcanundo = function(source) {
  const result = [];
  source((tiddler, title) => {if (undo.has(title)) result.push(title);});
  return result;
};
