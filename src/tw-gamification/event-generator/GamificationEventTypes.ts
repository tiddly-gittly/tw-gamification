/**
 * # 小型奖励：类似游戏中的游戏币、金币、钞票，一般是游戏内运营能获得的通用代币
# 大型奖励：类似游戏中的钻石、原石、宝石、点券，一般是游戏外充值能获得的现金等价物
# 小型惩罚：类似游戏中死一次的惩罚，倒扣体力，降低一些NPC好感等
# 大型惩罚：类似游戏中短暂封号一次的惩罚，中止短时间的生产，角色垂头丧气，抵扣一些消耗品

事件可以附带一个数量，以及相关的信息文本，如何使用由游戏自行决定。
 */
export enum BasicGamificationEventTypes {
  LargePunishment = 'LargePunishment',
  LargeReward = 'LargeReward',
  SmallPunishment = 'SmallPunishment',
  SmallReward = 'SmallReward',
}

export interface IGamificationEvent {
  amount?: number;
  message?: string;
  signature: string;
  timestamp: number;
  type: BasicGamificationEventTypes;
}
