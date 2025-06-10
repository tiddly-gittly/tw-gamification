import { buildRealityEventCacheItem } from '../../reality-event-cache/buildRealityEventCacheItem';
import { IAddRealityEventParameterObject, IAddRealityEventParameterObjectFromJSEventItem } from '../../types/RealityEventCacheTypes';
import { IActionDefinitions, IActionExtraParameterObject } from './types';

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

let eventsToSend: IAddRealityEventParameterObjectFromJSEventItem[] = [];

exports.startup = function twGamificationActionStartupModule() {
  const tagForGenerators = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/tw-gamification/tags/reality-action-meta-tag');
  if (!tagForGenerators) return;

  $tw.rootWidget.addEventListener('tm-reality-action-event', function onRealityEventAction(event) {
    const actionDefinitionTiddlerTitle = event.param;
    const parameterObject = event.paramObject as unknown as Partial<IActionDefinitions & IActionExtraParameterObject> | undefined;

    let eventGenerator: IActionDefinitions;
    let fromTiddlerTitle: string | undefined;

    if (actionDefinitionTiddlerTitle) {
      // Traditional mode: use the tiddler pointed by $param as the base definition
      const originalGeneratorDefinition = $tw.wiki.getTiddler(actionDefinitionTiddlerTitle)?.fields;
      if (!originalGeneratorDefinition) return false;

      // Check required fields for predefined action
      if (
        !originalGeneratorDefinition.tags?.includes(tagForGenerators) ||
        !originalGeneratorDefinition['reality-event-type'] ||
        !(originalGeneratorDefinition['title'])
      ) {
        console.error('tm-reality-action-event Invalid action definition tiddler. Missing required fields: tags, reality-event-type, or title.', actionDefinitionTiddlerTitle);
        return false;
      }

      if (parameterObject === undefined) {
        console.error('tm-reality-action-event No parameter object found for the action widget.', event);
        throw new Error('tm-reality-action-event No parameter object found for the action widget.');
      }

      // Merge and validate required fields
      const mergedDefinition = { ...originalGeneratorDefinition, ...parameterObject };
      if (!mergedDefinition['reality-event-type'] || !mergedDefinition['title']) {
        console.error('tm-reality-action-event Missing required fields after merging parameters.', mergedDefinition);
        return false;
      }

      eventGenerator = mergedDefinition as IActionDefinitions;
      fromTiddlerTitle = parameterObject.from ?? event.tiddlerTitle;
    } else {
      // New mode: use the parameter object directly as the event definition
      if (
        !parameterObject ||
        !parameterObject['reality-event-type'] ||
        // allow one-time activity only use caption.
        !(parameterObject['title'] ?? parameterObject['caption'])
      ) {
        console.error('tm-reality-action-event No valid event definition found. Missing required fields: reality-event-type or title.', parameterObject);
        return false;
      }

      eventGenerator = parameterObject as IActionDefinitions;
      fromTiddlerTitle = parameterObject.from ?? event.tiddlerTitle;
    }

    eventsToSend.push(buildRealityEventCacheItem(eventGenerator, fromTiddlerTitle));
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
    } satisfies IAddRealityEventParameterObject,
  });
  eventsToSend = [];
}
