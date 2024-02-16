import { ITiddlerFields } from 'tiddlywiki';

/**
 * 1. 小型奖励：类似游戏中的游戏币、金币、钞票，一般是游戏内运营能获得的通用代币
 * 1. 大型奖励：类似游戏中的钻石、原石、宝石、点券，一般是游戏外充值能获得的现金等价物
 * 1. 小型惩罚：类似游戏中死一次的惩罚，倒扣体力，降低一些NPC好感等
 * 1. 大型惩罚：类似游戏中短暂封号一次的惩罚，中止短时间的生产，角色垂头丧气，抵扣一些消耗品
 *
 * 事件可以附带一个数量，以及相关的信息文本，如何使用由游戏自行决定。
 */
export enum BasicGamificationEventTypes {
  LargePunishment = 'LargePunishment',
  LargeReward = 'LargeReward',
  SmallPunishment = 'SmallPunishment',
  SmallReward = 'SmallReward',
}

export interface IGamificationEvent {
  /**
   * The amount of the reward, default to 1.
   * If is not a number, can be a filter string that can be used to get the amount.
   */
  amount?: number | string;
  /**
   * A message that can be used to show to user to motivate them.
   * Can be any wiki text.
   */
  message?: string;
  timestamp: number;
  type: BasicGamificationEventTypes;
}

/**
 * Field start with `game-event` are come from the `IGamificationEvent` interface, by adding a prefix `game-event` to the field name, and concat with `-`.
 */
export interface IGeneratorDefinitions extends ITiddlerFields {
  /**
   * A valid filter expression that can be used to get the tiddler that will trigger the event.
   * This will be used as a sub-filter concat after the recent changed tiddlers in Tiddlywiki's `'change'` event, deciding if changed tiddler is what we want.
   */
  filter: string;
  ['game-event-amount']?: number | string;
  ['game-event-message']?: string;
  /**
   * The type of the event.
   */
  ['game-event-type']: BasicGamificationEventTypes;
}
