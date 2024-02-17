/**
 * Get different tiddler in different platform to prevent sync conflict
 * 
 * (currently, only sync between TidGi desktops are using git, sync between TidGi desktop and TidGi mobile are using a simple sync that will cause complete overwrite on conflict, so need to separate them).
 * @returns The title of the log queue tiddler
 */
export function getLogQueueTitle(): string {
  if ($tw.wiki.getTiddlerText('$:/info/mobile') === 'yes') {
    return '$:/plugins/linonetwo/tw-gamification/saves/log-cache-file/mobile';
  }
  return '$:/plugins/linonetwo/tw-gamification/saves/log-cache-file/desktop';
}
