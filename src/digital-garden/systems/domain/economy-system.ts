/**
 * EconomySystem — three-tier currency model and blueprint/world unlock.
 *
 * Currency hierarchy (no reverse exchange):
 *   LargeReward → gold → silver → copper
 *   SmallReward → copper
 *
 * Lord level progression:
 *   Unlocking blueprints grants lord exp.
 *   Higher lord levels increase the gold→silver exchange rate.
 *
 * PLAN Phase 2 — domain layer
 */

import type { EconomyTransactionResult, GardenEconomyConfig } from '../../types/economy-types';
import type { GardenGlobalSave } from '../../types/save-types';
import type { SaveScheduler } from '../infra/save-scheduler';
import type { TiddlerRepository } from '../infra/tiddler-repository';

export class EconomySystem {
  private save!: GardenGlobalSave;
  private config!: GardenEconomyConfig;
  private pendingCopperDelta = 0;
  private pendingGoldDelta = 0;
  private pendingSilverDelta = 0;

  constructor(
    private readonly repo: TiddlerRepository,
    private readonly scheduler: SaveScheduler,
  ) {}

  init(save: GardenGlobalSave, config: GardenEconomyConfig): void {
    this.save = save;
    this.config = config;
  }

  // ─── Currency access ──────────────────────────────────────────────────────

  get copper(): number {
    return this.save.copperCoins;
  }
  get gold(): number {
    return this.save.goldCoins;
  }
  get silver(): number {
    return this.save.silverCoins;
  }
  get lordLevel(): number {
    return this.save.lordLevel;
  }
  get lordExp(): number {
    return this.save.lordExp;
  }

  // ─── Event-driven credits (called by EventBridgeSystem) ───────────────────

  creditCopper(eventAmount: number): void {
    this.pendingCopperDelta += eventAmount * this.config.copperPerSmallReward;
  }

  debitCopper(eventAmount: number): void {
    this.pendingCopperDelta -= eventAmount * this.config.copperPerSmallPunishment;
  }

  creditGold(eventAmount: number): void {
    this.pendingGoldDelta += eventAmount * this.config.goldPerLargeReward;
  }

  debitGold(eventAmount: number): void {
    this.pendingGoldDelta -= eventAmount * this.config.goldPerLargePunishment;
  }

  /** Apply and persist pending event deltas. Called after consuming an event batch. */
  async flushPendingTransactions(): Promise<void> {
    if (this.pendingCopperDelta !== 0 || this.pendingGoldDelta !== 0 || this.pendingSilverDelta !== 0) {
      this.save.copperCoins = Math.max(0, this.save.copperCoins + this.pendingCopperDelta);
      this.save.goldCoins = Math.max(0, this.save.goldCoins + this.pendingGoldDelta);
      this.save.silverCoins = Math.max(0, this.save.silverCoins + this.pendingSilverDelta);
      this.pendingCopperDelta = 0;
      this.pendingGoldDelta = 0;
      this.pendingSilverDelta = 0;
      this.scheduler.scheduleGlobalSave(this.save, 'immediate');
    }
  }

  // ─── Player-initiated spending ────────────────────────────────────────────

  /** Spend copper (e.g. placement, maintenance) */
  spendCopper(amount: number): EconomyTransactionResult {
    if (this.save.copperCoins < amount) return { ok: false, reason: 'insufficient-copper' };
    this.save.copperCoins -= amount;
    this.scheduler.scheduleGlobalSave(this.save, 'soon');
    return { ok: true };
  }

  /** Spend gold to unlock a blueprint */
  unlockBlueprint(blueprintId: string, goldCost: number, requiredLevel: number): EconomyTransactionResult {
    if (this.save.lordLevel < requiredLevel) return { ok: false, reason: 'level-required', requiredLevel };
    if (this.save.goldCoins < goldCost) return { ok: false, reason: 'insufficient-gold' };
    if (this.save.unlockedBlueprints.includes(blueprintId)) return { ok: true };

    this.save.goldCoins -= goldCost;
    this.save.unlockedBlueprints.push(blueprintId);
    this.addLordExp(this.config.lordExpPerBlueprint);
    this.scheduler.scheduleGlobalSave(this.save, 'immediate');
    return { ok: true };
  }

  /** Spend silver to unlock a world */
  unlockWorld(worldId: string, silverCost: number): EconomyTransactionResult {
    if (this.save.silverCoins < silverCost) return { ok: false, reason: 'insufficient-silver' };
    if (this.save.unlockedWorlds.includes(worldId)) return { ok: true };

    this.save.silverCoins -= silverCost;
    this.save.unlockedWorlds.push(worldId);
    this.scheduler.scheduleGlobalSave(this.save, 'immediate');
    return { ok: true };
  }

  /** Exchange gold → silver (rate boosted by lord level) */
  exchangeGoldToSilver(goldAmount: number): EconomyTransactionResult {
    if (this.save.goldCoins < goldAmount) return { ok: false, reason: 'insufficient-gold' };
    const boost = 1 + (this.save.lordLevel - 1) * (this.config.goldExchangeBoostPerLevel / 100);
    const silverGained = Math.floor(goldAmount * this.config.goldToSilverBaseRate * boost);
    this.save.goldCoins -= goldAmount;
    this.save.silverCoins += silverGained;
    this.scheduler.scheduleGlobalSave(this.save, 'immediate');
    return { ok: true };
  }

  /** Exchange silver → copper */
  exchangeSilverToCopper(silverAmount: number): EconomyTransactionResult {
    if (this.save.silverCoins < silverAmount) return { ok: false, reason: 'insufficient-silver' };
    const copperGained = silverAmount * this.config.silverToCopperRate;
    this.save.silverCoins -= silverAmount;
    this.save.copperCoins += copperGained;
    this.scheduler.scheduleGlobalSave(this.save, 'immediate');
    return { ok: true };
  }

  isBlueprintUnlocked(blueprintId: string): boolean {
    return this.save.unlockedBlueprints.includes(blueprintId);
  }

  isWorldUnlocked(worldId: string): boolean {
    return this.save.unlockedWorlds.includes(worldId);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private addLordExp(amount: number): void {
    this.save.lordExp += amount;
    const thresholds = this.config.lordLevelExpThresholds;
    while (this.save.lordLevel < thresholds.length && this.save.lordExp >= thresholds[this.save.lordLevel]) {
      this.save.lordLevel++;
    }
  }
}
