/**
 * Get different tiddler in different platform to prevent sync conflict
 * 
 * (currently, only sync between TidGi desktops are using git, sync between TidGi desktop and TidGi mobile are using a simple sync that will cause complete overwrite on conflict, so need to separate them).
 * @returns The title of the log queue tiddler
 */
export function getRealityEventCacheTitle(): string {
  if ($tw.wiki.getTiddlerText('$:/info/mobile') === 'yes') {
    return '$:/plugins/linonetwo/tw-gamification/reality-event-cache/cache-files/mobile';
  }
  return '$:/plugins/linonetwo/tw-gamification/reality-event-cache/cache-files/desktop';
}
