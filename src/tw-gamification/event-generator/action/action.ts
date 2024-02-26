/* eslint-disable array-callback-return */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { IGameEventLogCacheItem } from 'src/tw-gamification/event-queue/GamificationEventLogTypes';
import { buildEventLogQueueItem } from '../buildEventLogQueueItem';
import { IActionDefinitions, IActionExtraParameterObject } from './types';

// eslint-disable-next-line no-var
declare var exports: {
  after: string[];
  name: string;
  platforms: string[];
  startup: () => void;
  synchronous: boolean;
};
exports.name = 'tw-gamification-action';
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

let eventsToSend: IGameEventLogCacheItem[] = [];

exports.startup = function twGamificationActionStartupModule() {
  const runOnMobile = $tw.wiki.getTiddlerText('$:/info/mobile');
  // TODO: need to check for HTML env on desktop like TiddlywikiDesktop. But need to know it is nodejs based on browser, which currently is not possible.
  const allowRunOnFrontend = $tw.browser && runOnMobile;
  const allowRunOnBackend = !!$tw.node;
  if (!allowRunOnFrontend && !allowRunOnBackend) return;

  const tagForGenerators = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/tw-gamification/tags/action-meta-tag');
  if (!tagForGenerators) return;

  $tw.rootWidget.addEventListener('tm-gamification-event-action', function onGamificationEventAction(event) {
    const actionDefinitionTiddlerTitle = event.param;
    if (!actionDefinitionTiddlerTitle) return;
    const originalGeneratorDefinition = $tw.wiki.getTiddler(actionDefinitionTiddlerTitle)?.fields;
    if (!originalGeneratorDefinition) return;
    // check the definition is a valid action definition
    if (!originalGeneratorDefinition.tags.includes(tagForGenerators) || !originalGeneratorDefinition['game-event-type']) return;
    // allow override the definition on action widget
    const parameterObject = (event.paramObject ?? {}) as unknown as IActionDefinitions & IActionExtraParameterObject;
    const eventGenerator: IActionDefinitions = { ...originalGeneratorDefinition, ...parameterObject };
    eventsToSend.push(buildEventLogQueueItem(eventGenerator, parameterObject.from ?? event.tiddlerTitle));
    // debounce the sending of events
    setTimeout(dispatchAddGamificationEventBatch, 1);
  });
};

function dispatchAddGamificationEventBatch() {
  if (eventsToSend.length === 0) return;
  $tw.rootWidget.dispatchEvent({
    type: 'tm-add-gamification-event',
    paramObject: {
      events: eventsToSend,
    },
  });
  eventsToSend = [];
}
