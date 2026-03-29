/**
 * EventBridgeSystem — consumes tw-gamification reality events and converts them
 * into economic transactions within the Digital Garden domain layer.
 *
 * Flow:
 *   tw-gamification cache → EventBridgeSystem.consumeEvents()
 *     → EconomySystem.credit/debit(currency, amount)
 *     → SaveScheduler.scheduleWrite(globalSave)
 *
 * Returns true only when all events have been processed and persisted,
 * so the cache can be cleared safely.
 *
 * PLAN Phase 2 — event bridge implementation
 */

import type { IRealityEventCacheCacheFile } from 'src/tw-gamification/types/RealityEventCacheTypes';
import type { EconomySystem } from '../domain/economy-system';

export class EventBridgeSystem {
  private economySystem: EconomySystem | undefined;

  /** Called by GardenApp after all systems are initialised */
  bind(economySystem: EconomySystem): void {
    this.economySystem = economySystem;
  }

  /**
   * Process a batch of reality events from the tw-gamification cache.
   * Returns true if all events were successfully processed.
   *
   * Event type mapping:
   *   SmallReward      → +copper (amount * copperPerSmallReward)
   *   SmallPunishment  → -copper (amount * copperPerSmallPunishment)
   *   LargeReward      → +gold   (amount * goldPerLargeReward)
   *   LargePunishment  → -gold   (amount * goldPerLargePunishment)
   *   Item             → TODO: unlock a blueprint or world (item id lookup)
   */
  async consumeEvents(items: IRealityEventCacheCacheFile, maxAmount: number): Promise<boolean | IRealityEventCacheCacheFile> {
    if (!this.economySystem) return false;

    const unconsumed: IRealityEventCacheCacheFile = [];
    let consumedCount = 0;

    try {
      for (const item of items) {
        if (consumedCount >= maxAmount) {
          unconsumed.push(item);
          continue;
        }

        const { type, amount = 1 } = item.event;
        const numberAmount = typeof amount === 'number' ? amount : Number(amount) || 1;

        switch (type) {
          case 'SmallReward':
            this.economySystem.creditCopper(numberAmount);
            consumedCount += 1;
            break;
          case 'SmallPunishment':
            this.economySystem.debitCopper(numberAmount);
            consumedCount += 1;
            break;
          case 'LargeReward':
            this.economySystem.creditGold(numberAmount);
            consumedCount += 1;
            break;
          case 'LargePunishment':
            this.economySystem.debitGold(numberAmount);
            consumedCount += 1;
            break;
          case 'Item':
            if (item.event.item) {
              const itemTitle = item.event.item;
              const isBlueprint = itemTitle.includes('/blueprints/');
              const isWorld = itemTitle.includes('/worlds/');
              if (isBlueprint) {
                const parts = itemTitle.split('/');
                const bpId = parts[parts.length - 1];
                if (bpId) this.economySystem.unlockBlueprint(bpId, 0, 0);
              } else if (isWorld) {
                const parts = itemTitle.split('/');
                const worldId = parts[parts.length - 1];
                if (worldId) this.economySystem.unlockWorld(worldId, 0);
              }
              consumedCount += 1;
            } else {
              unconsumed.push(item);
            }
            break;
          default:
            unconsumed.push(item);
            break;
        }
      }

      // Trigger a save after processing all events
      await this.economySystem.flushPendingTransactions();

      return unconsumed;
    } catch (error) {
      console.error('[DigitalGarden] EventBridgeSystem.consumeEvents failed:', error);
      return false;
    }
  }
}
