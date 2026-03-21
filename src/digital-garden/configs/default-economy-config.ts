/**
 * Default economy configuration constants.
 * These values are read from configs.multids at runtime (via TiddlerRepository).
 * This file provides the compile-time fallback used during init.
 */

import type { GardenEconomyConfig } from '../types/economy-types';

export const DEFAULT_ECONOMY_CONFIG: GardenEconomyConfig = {
  copperPerSmallReward: 1,
  copperPerSmallPunishment: 1,
  goldPerLargeReward: 1,
  goldPerLargePunishment: 1,
  goldToSilverBaseRate: 1,
  silverToCopperRate: 10,
  lordExpPerBlueprint: 10,
  /** Level thresholds: level 2 requires 20 exp, level 3 requires 50, etc. */
  lordLevelExpThresholds: [0, 20, 50, 100, 180, 300, 500, 800, 1200, 2000],
  goldExchangeBoostPerLevel: 5,
};
