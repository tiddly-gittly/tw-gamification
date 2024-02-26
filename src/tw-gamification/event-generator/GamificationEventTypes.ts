/**
 * 1. 小型奖励：类似游戏中的游戏币、金币、钞票，一般是游戏内运营能获得的通用代币
 * 1. 大型奖励：类似游戏中的钻石、原石、宝石、点券，一般是游戏外充值能获得的现金等价物
 * 1. 小型惩罚：类似游戏中死一次的惩罚，倒扣体力，降低一些NPC好感等
 * 1. 大型惩罚：类似游戏中短暂封号一次的惩罚，中止短时间的生产，角色垂头丧气，抵扣一些消耗品
 * 1. 物品：类似游戏中的装备、道具、材料、标记物，需要指定一个条目标题，该条目上的字段会作为物品的信息，`caption` 字段作为生成的物品的名字，`icon` 字段作为物品贴图，`text` 字段可以包含动作微件，作为使用物品的触发效果。
 *
 * 事件可以附带一个数量，以及相关的信息文本，如何使用由游戏自行决定。
 */
export enum BasicGamificationEventTypes {
  Item = 'Item',
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
   * Default to `BasicGamificationEventTypes.SmallReward`.
   */
  event?:
    | BasicGamificationEventTypes.LargePunishment
    | BasicGamificationEventTypes.LargeReward
    | BasicGamificationEventTypes.SmallPunishment
    | BasicGamificationEventTypes.SmallReward
    | BasicGamificationEventTypes.Item;
  /**
   * Title of the tiddler that contains the item information.
   */
  item: string;
  /**
   * A message that can be used to show to user to motivate them.
   * Can be any wiki text.
   */
  message?: string;
  timestamp: number;
}
