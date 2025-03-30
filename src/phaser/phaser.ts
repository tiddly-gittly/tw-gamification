declare var exports: {
  name: string;
  platforms: string[];
  after: string[];
  synchronous: boolean;
  startup: () => void;
};

exports.name = 'jszip';
exports.platforms = ['browser'];
exports.after = [];
exports.synchronous = true;

exports.startup = function() {
  /**
   * This allows Phaser to be loaded from `window` globally.
   * But needs wait for it to work:
   * ```ts
   *     void (async () => {
   *  // Wait for Phaser to be loaded to window.Phaser
   *  await new Promise(resolve => setTimeout(resolve, 10));
   *  // then use it.
   *  new Phaser.Game
   *  ```
   */
  void import('phaser').then((module) => {
    const Phaser = module.default;
    window.Phaser = Phaser;
  });
};
