/**
 * Economy system types — three-tier currency model.
 *
 * Tier 1 (Copper):  SmallReward → copper  | daily ops, placement
 * Tier 2 (Gold):    LargeReward → gold    | blueprint unlock, gold→silver exchange
 * Tier 3 (Silver):  gold→silver           | world unlock, silver→copper exchange
 *
 * Exchange direction: gold → silver → copper (no reverse)
 */

/** Runtime economy config, sourced from configs.multids */
export interface GardenEconomyConfig {
  /** Copper coins per SmallReward event */
  copperPerSmallReward: number;
  /** Copper deducted per SmallPunishment event */
  copperPerSmallPunishment: number;
  /** Gold coins per LargeReward event */
  goldPerLargeReward: number;
  /** Gold deducted per LargePunishment event */
  goldPerLargePunishment: number;
  /** Gold→silver exchange rate: 1 gold = N silver (floats with lord level) */
  goldToSilverBaseRate: number;
  /** Silver→copper exchange rate: 1 silver = N copper */
  silverToCopperRate: number;
  /** Lord exp per blueprint unlocked */
  lordExpPerBlueprint: number;
  /** Lord level thresholds (exp required to reach level i) */
  lordLevelExpThresholds: number[];
  /** % boost to gold→silver exchange rate per lord level */
  goldExchangeBoostPerLevel: number;
}

/** Result of an economic transaction */
export type EconomyTransactionResult =
  | { ok: true }
  | { ok: false; reason: 'insufficient-copper' | 'insufficient-gold' | 'insufficient-silver' | 'level-required'; requiredLevel?: number };

/** Event types this game consumes from tw-gamification */
export type ConsumedEventType = 'SmallReward' | 'LargeReward' | 'SmallPunishment' | 'LargePunishment' | 'Item';

/** Pending economic transaction waiting to be settled */
export interface PendingEconomyTransaction {
  id: string;
  type: 'credit' | 'debit';
  currency: 'copper' | 'gold' | 'silver';
  amount: number;
  sourceEventId?: string;
  timestamp: number;
}
