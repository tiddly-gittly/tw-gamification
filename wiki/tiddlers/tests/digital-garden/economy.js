/* eslint-disable unicorn/prevent-abbreviations, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-require-imports */
const { EconomySystem } = require('$:/plugins/linonetwo/digital-garden/systems/domain/economy-system.js');

describe('EconomySystem', function() {
  it('should initialize and hold correct coins', function() {
    const eco = new EconomySystem({}, {});
    eco.init({ copperCoins: 10, goldCoins: 20, silverCoins: 30, lordLevel: 1, lordExp: 0 }, { copperPerSmallReward: 1 });
    expect(eco.copper).toBe(10);
    expect(eco.gold).toBe(20);
    expect(eco.silver).toBe(30);
  });
});
