
exports.name = 'jszip';
exports.platforms = ['browser'];
exports.after = [];
exports.synchronous = true;

exports.startup = function() {
  import('phaser').then((module) => {
    // DEBUG: console module
    console.log(`module`, module);
    const Phaser = module.default;
    window.Phaser = Phaser;
  });
};
