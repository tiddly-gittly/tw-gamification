/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable unicorn/no-array-callback-reference */
/* eslint-disable array-callback-return */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import pick from 'lodash/pick';
import { formatDuplicationFields } from '../reality-event-generator/deduplication/formatDuplicationFields';
import { getRealityEventCacheTitle } from './cache-files/getTitle';
import { checkAndPushAnItemToLogAndCacheFile } from './checkAndPushAnItemToLogAndCacheFile';
import {
  IAddRealityEventParameterObject,
  IAddRealityEventParameterObjectFromActionWidget,
  IRealityEventCacheCacheFile,
  IRealityEventCacheCacheItem,
} from './RealityEventCacheTypes';

// eslint-disable-next-line no-var
declare var exports: {
  after: string[];
  name: string;
  platforms: string[];
  startup: () => void;
  synchronous: boolean;
};
exports.name = 'tw-gamification-handle-reality-event-cache';
/**
 * This creates event handlers, should work on both side to receive event from both buttons and event generators.
 */
exports.platforms = ['browser', 'node'];
exports.after = ['story'];
exports.synchronous = true;

exports.startup = function twGamificationHandleEventCacheQueueStartupModule() {
  const eventCacheTitle = getRealityEventCacheTitle();
  // Listen for widget messages to create one or many IRealityEventCacheCacheItem, append to the log cache file.
  $tw.rootWidget.addEventListener('tm-add-reality-event', function onAddRealityEvent(event) {
    const parameterObject = (event.paramObject ?? {}) as unknown as IAddRealityEventParameterObject;
    const eventCacheFile = $tw.wiki.getTiddler(eventCacheTitle);
    const eventCacheFileContent = eventCacheFile?.fields.text;
    const eventCache: IRealityEventCacheCacheFile = eventCacheFileContent ? $tw.utils.parseJSONSafe(eventCacheFileContent) : [];
    let hasModification = false;
    if ('events' in parameterObject) {
      // Add many events at once
      const events = parameterObject.events;
      events.forEach((eventItem) => {
        hasModification = checkAndPushAnItemToLogAndCacheFile(eventItem, formatDuplicationFields(eventItem), { eventCache });
      });
    } else {
      hasModification = checkAndPushAnItemToLogAndCacheFile(getEventFromParameterObject(parameterObject), formatDuplicationFields(parameterObject), { eventCache });
    }
    // if no change, then no need to update the tiddler. Note that update tiddler may trigger 'change' event, which may cause infinite loop if not handle properly.
    if (!hasModification) return false;
    const newText = JSON.stringify(eventCache);
    if (newText === eventCacheFileContent) return false;
    // added here, deleted in `src/tw-gamification/game-wiki-adaptor/game-wiki-provider.ts`
    $tw.wiki.addTiddler({ ...eventCacheFile?.fields, text: newText });
    return false;
  });
};

function getEventFromParameterObject(
  parameterObject: IAddRealityEventParameterObjectFromActionWidget,
): IRealityEventCacheCacheItem {
  const event = pick(parameterObject, ['amount', 'type', 'message', 'timestamp', 'item']);
  return {
    event,
    meta: {
      generator: parameterObject.generator || 'ActionWidget',
      tiddlerTitle: parameterObject.tiddlerTitle,
    },
  };
}
