/* eslint-disable array-callback-return */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { SourceIterator } from 'tiddlywiki';
import { IGeneratorDefinitions } from './GamificationEventTypes';

// eslint-disable-next-line no-var
declare var exports: {
  after: string[];
  name: string;
  platforms: string[];
  startup: () => void;
  synchronous: boolean;
};
exports.name = 'tw-gamification-filter-event-generator';
/**
 * If we are in mobile, then run on browser. If is in TidGi desktop, then only run on node, skip browser side code execution.
 */
exports.platforms = ['browser', 'node'];
if ($tw.browser) {
  exports.after = ['render'];
} else {
  exports.after = ['load-modules'];
}
exports.synchronous = true;
exports.startup = function twGamificationFilterEventGeneratorStartupModule() {
  const runOnMobile = $tw.wiki.getTiddlerText('$:/info/mobile');
  const allowRunOnFrontend = $tw.browser && runOnMobile;
  const allowRunOnBackend = !!$tw.node;
  if (!allowRunOnFrontend && !allowRunOnBackend) return;

  const tagForGenerators = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/tw-gamification/event-generator/filter-event-generator-meta-tag');
  if (!tagForGenerators) return;
  const generatorDefinitions = $tw.wiki.getTiddlersWithTag(tagForGenerators).map(tiddlerTitle => {
    const tiddler = $tw.wiki.getTiddler(tiddlerTitle);
    if (!tiddler) return;
    if (!tiddler.fields.filter) return;
    return tiddler.fields;
  }).filter((item): item is IGeneratorDefinitions => item !== undefined);
  const generatorFilterFunctions = generatorDefinitions.map(definiton => $tw.wiki.compileFilter(definiton.filter));
  $tw.wiki.addEventListener('change', function(changes) {
    const allFilteredChanges: string[] = [];
    generatorFilterFunctions.forEach(filterFunction => {
      // Filter the changes so that we only count changes to tiddlers that we care about
      const filteredChanges = filterFunction((iterator: SourceIterator) => {
        $tw.utils.each(changes, function(change, title) {
          const tiddler = $tw.wiki.getTiddler(title);
          iterator(tiddler, title);
        });
      });
      allFilteredChanges.push(...filteredChanges);
    });
    // DEBUG: console allFilteredChanges
    console.log(`allFilteredChanges`, allFilteredChanges);
  });
};
