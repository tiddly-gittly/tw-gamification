"use strict";
const records = new Map();
exports.save = function(wiki, title) {records.set(title, wiki.getTiddler(title));};
exports.has = function(title) {return records.has(title);};
exports.restore = function(wiki, title) {
  wiki.addTiddler(records.get(title));
  records.delete(title);
};
