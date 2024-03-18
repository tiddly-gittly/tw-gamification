/* eslint-disable array-callback-return */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { SourceIterator } from 'tiddlywiki';
import { buildRealityEventCacheItem } from '../../reality-event-cache/buildRealityEventCacheItem';
import { IRealityEventCacheCacheItem } from '../../reality-event-cache/RealityEventCacheTypes';
import { IFilterEventGeneratorDefinitions } from './types';

// eslint-disable-next-line no-var
declare var exports: {
  after: string[];
  name: string;
  platforms: string[];
  startup: () => void;
  synchronous: boolean;
};
exports.name = 'tw-gamification-change-filter';
/**
 * If we are in mobile, then run on browser. If is in TidGi desktop, then only run on node, skip browser side code execution.
 */
exports.platforms = ['browser', 'node'];
// delay execution as we can. Game is of low priority in a knowledge base. And onChange's calculation is heavy here.
if ($tw.browser) {
  exports.after = ['render'];
} else {
  exports.after = ['commands'];
}
exports.synchronous = true;
exports.startup = function twGamificationFilterEventGeneratorStartupModule() {
  const runOnMobile = $tw.wiki.getTiddlerText('$:/info/mobile');
  // TODO: need to check for HTML env on desktop like TiddlywikiDesktop. But need to know it is nodejs based on browser, which currently is not possible.
  const allowRunOnFrontend = $tw.browser && runOnMobile;
  const allowRunOnBackend = !!$tw.node;
  if (!allowRunOnFrontend && !allowRunOnBackend) return;

  const tagForGenerators = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/tw-gamification/tags/change-filter-meta-tag');
  if (!tagForGenerators) return;
  const generatorDefinitions = $tw.wiki.getTiddlersWithTag(tagForGenerators).map(tiddlerTitle => {
    const tiddler = $tw.wiki.getTiddler(tiddlerTitle);
    if (!tiddler) return;
    if (!tiddler.fields['reality-event-trigger-filter']) return;
    return tiddler.fields;
  }).filter((item): item is IFilterEventGeneratorDefinitions => item !== undefined);
  const generatorWithFilterFunctions = generatorDefinitions.map(definition => ({
    ...definition,
    filter: $tw.wiki.compileFilter(definition['reality-event-trigger-filter']),
  }));
  $tw.wiki.addEventListener('change', function(changes) {
    // TODO: debounce and batch process the events
    // TODO: mark frequently changed and not qualified tiddlers, so that we can skip them to save execution time.
    const events: IRealityEventCacheCacheItem[] = [];
    generatorWithFilterFunctions.forEach(eventGenerator => {
      // Filter the changes so that we only count changes to tiddlers that we care about
      const tiddlerTitleTriggerTheEvent = eventGenerator.filter((iterator: SourceIterator) => {
        $tw.utils.each(changes, (change, title) => {
          const tiddler = $tw.wiki.getTiddler(title);
          iterator(tiddler, title);
          return undefined;
        });
      });
      if (generatorWithFilterFunctions.length === 0) return;
      events.push(...tiddlerTitleTriggerTheEvent.map((tiddlerTitle): IRealityEventCacheCacheItem => buildRealityEventCacheItem(eventGenerator, tiddlerTitle)));
    });
    if (events.length === 0) return;
    $tw.rootWidget.dispatchEvent({
      type: 'tm-add-reality-event',
      paramObject: {
        events,
      },
    });
  });
};
