/* eslint-disable array-callback-return */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { SourceIterator } from 'tiddlywiki';
import { DEFAULT_AMOUNT } from './constants';
import { IGameEventLogCacheItem } from './GamificationEventLogTypes';
import { BasicGamificationEventTypes, IFilterEventGeneratorDefinitions } from './GamificationEventTypes';

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

  const tagForGenerators = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/tw-gamification/event-generator/filter-event-generator-meta-tag');
  if (!tagForGenerators) return;
  const generatorDefinitions = $tw.wiki.getTiddlersWithTag(tagForGenerators).map(tiddlerTitle => {
    const tiddler = $tw.wiki.getTiddler(tiddlerTitle);
    if (!tiddler) return;
    if (!tiddler.fields.filter) return;
    return tiddler.fields;
  }).filter((item): item is IFilterEventGeneratorDefinitions => item !== undefined);
  const generatorWithFilterFunctions = generatorDefinitions.map(definition => ({
    ...definition,
    filter: $tw.wiki.compileFilter(definition.trigger),
  }));
  $tw.wiki.addEventListener('change', function(changes) {
    const events: IGameEventLogCacheItem[] = [];
    generatorWithFilterFunctions.forEach(eventGenerator => {
      // Filter the changes so that we only count changes to tiddlers that we care about
      const tiddlerTitleTriggerTheEvent = eventGenerator.filter((iterator: SourceIterator) => {
        $tw.utils.each(changes, function(change, title) {
          const tiddler = $tw.wiki.getTiddler(title);
          iterator(tiddler, title);
        });
      });
      if (generatorWithFilterFunctions.length === 0) return;
      const { 'game-event-amount': amount, 'game-event-message': message, 'game-event-type': event = BasicGamificationEventTypes.SmallReward, title } = eventGenerator;

      events.push(...tiddlerTitleTriggerTheEvent.map(tiddlerTitle => ({
        event: {
          timestamp: Date.now(),
          event,
          amount: processAmount(amount),
          message: processMessage(message),
        },
        tiddlerTitle,
        generator: title,
      })));
    });
    if (events.length === 0) return;
    $tw.rootWidget.dispatchEvent({
      type: 'tm-add-gamification-event',
      paramObject: {
        events,
      },
    });
  });
};

function processAmount(amount: string | number | undefined): number {
  if (amount === undefined) {
    return DEFAULT_AMOUNT;
  }
  if (typeof amount === 'number' || Number.isFinite(Number(amount))) {
    return Number(amount);
  }
  // try run it as a filter expression, to see if we can get the amount number
  const amountFilteredResult = $tw.wiki.filterTiddlers(amount)?.[0];
  if (!amountFilteredResult) {
    return DEFAULT_AMOUNT;
  }
  if (Number.isFinite(Number(amountFilteredResult))) {
    return Number(amountFilteredResult);
  }
  return DEFAULT_AMOUNT;
}

function processMessage(message: string | undefined): string | undefined {
  if (!message) return;
  return $tw.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', message);
}