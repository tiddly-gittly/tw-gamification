/* eslint-disable array-callback-return */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */

import { IAddGamificationEventParameterObject, IGameEventLogCacheFile } from './GamificationEventLogTypes';

// eslint-disable-next-line no-var
declare var exports: {
  after: string[];
  name: string;
  platforms: string[];
  startup: () => void;
  synchronous: boolean;
};
exports.name = 'tw-gamification-handle-event-log-queue';
/**
 * This creates event handlers, should work on both side to receive event from both buttons and event generators.
 */
exports.platforms = ['browser', 'node'];
exports.after = ['startup'];
exports.synchronous = true;
exports.startup = function twGamificationHandleEventLogQueueStartupModule() {
  // Listen for widget messages to create one or many IGameEventLogCacheItem, append to the log cache file.
  $tw.rootWidget.addEventListener('tm-add-gamification-event', function(event) {
    const parameterObject = (event.paramObject ?? {}) as unknown as IAddGamificationEventParameterObject;
    const logCacheFileContent = $tw.wiki.getTiddlerText('$:/state/tw-gamification/log-cache-file');
    const logCache: IGameEventLogCacheFile = logCacheFileContent ? $tw.utils.parseJSONSafe(logCacheFileContent) : [];
    // TODO: deduplicate the tiddlerTitleTriggerTheEvent
    if ('events' in parameterObject) {
      // Add many events at once
      const events = parameterObject.events;
      logCache.push(...events);
    } else {
      const { tiddlerTitle, ...event } = parameterObject;
      logCache.push({ event, tiddlerTitle });
    }
    $tw.wiki.addTiddler({ title: '$:/state/tw-gamification/log-cache-file', text: JSON.stringify(logCache) });
  });
};
