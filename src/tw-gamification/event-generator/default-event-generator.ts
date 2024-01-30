// eslint-disable-next-line no-var
declare var exports: {
  after: string[];
  name: string;
  platforms: string[];
  startup: () => void;
  synchronous: boolean;
};
exports.name = 'tw-gamification-default-event-generator';
/**
 * If we are in mobile, then run on browser. If is in TidGi desktop, then only run on node, skip browser.
 */
exports.platforms = ['browser', 'node'];
exports.after = ['story', 'render'];
exports.synchronous = true;
exports.startup = function twGamificationDefaultEventGeneratorStartupModule() {
  $tw.wiki.addEventListener('change', function(changes) {});
};
