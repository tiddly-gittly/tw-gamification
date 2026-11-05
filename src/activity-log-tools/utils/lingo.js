"use strict";
const base = "$:/plugins/linonetwo/activity-log-tools/language/";
exports.lingo = function(key, values = {}) {
  let text = $tw.wiki.renderText("text/plain", "text/vnd.tiddlywiki", `\\import [[$:/core/macros/lingo]]\n\n<<lingo ${key} ${base}>>`);
  for (const [name, value] of Object.entries(values)) text = text.replaceAll(`$${name}$`, String(value));
  return text;
};
