/* eslint-disable array-callback-return */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { IRealityEventCacheCacheItem } from '../../reality-event-cache/RealityEventCacheTypes';
import { buildRealityEventCacheItem } from '../buildRealityEventCacheItem';
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

let eventsToSend: IRealityEventCacheCacheItem[] = [];

exports.startup = function twGamificationActionStartupModule() {
  const tagForGenerators = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/tw-gamification/tags/reality-action-meta-tag');
  if (!tagForGenerators) return;

  $tw.rootWidget.addEventListener('tm-reality-action-event', function onRealityEventAction(event) {
    const actionDefinitionTiddlerTitle = event.param;
    if (!actionDefinitionTiddlerTitle) return false;
    const originalGeneratorDefinition = $tw.wiki.getTiddler(actionDefinitionTiddlerTitle)?.fields;
    if (!originalGeneratorDefinition) return false;
    // check the definition is a valid action definition
    if (!originalGeneratorDefinition.tags.includes(tagForGenerators) || !originalGeneratorDefinition['reality-event-type']) return false;
    // allow override the definition on action widget
    const parameterObject = (event.paramObject ?? {}) as unknown as IActionDefinitions & IActionExtraParameterObject;
    const eventGenerator: IActionDefinitions = { ...originalGeneratorDefinition, ...parameterObject };
    eventsToSend.push(buildRealityEventCacheItem(eventGenerator, parameterObject.from ?? event.tiddlerTitle));
    // debounce the sending of events
    setTimeout(dispatchAddRealityEventBatch, 1);
    return false;
  });
};

function dispatchAddRealityEventBatch() {
  if (eventsToSend.length === 0) return;
  $tw.rootWidget.dispatchEvent({
    type: 'tm-add-reality-event',
    paramObject: {
      events: eventsToSend,
    },
  });
  eventsToSend = [];
}
