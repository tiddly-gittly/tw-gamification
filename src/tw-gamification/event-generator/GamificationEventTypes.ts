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
   * Default to `BasicGamificationEventTypes.SmallReward`.
   */
  event?: BasicGamificationEventTypes;
  /**
   * A message that can be used to show to user to motivate them.
   * Can be any wiki text.
   */
  message?: string;
  timestamp: number;
}

/**
 * Fields for a filter based event generator. With tag `$:/Tags/Gamification/filter-event-generator`
 *
 * Field start with `game-event` are come from the `IGamificationEvent` interface, by adding a prefix `game-event` to the field name, and concat with `-`.
 */
export interface IFilterEventGeneratorDefinitions extends ITiddlerFields, IDuplicationStrategy, IFindDuplicateParameters {
  ['game-event-amount']?: number | string;
  ['game-event-message']?: string;
  /**
   * The type of the event.
   */
  ['game-event-type']: BasicGamificationEventTypes;
  /**
   * A valid filter expression that can be used to get the tiddler that will trigger the event.
   * This will be used as a sub-filter concat after the recent changed tiddlers in Tiddlywiki's `'change'` event, deciding if changed tiddler is what we want.
   */
  trigger: string;
}

export interface IDuplicationStrategy {
  /**
   * Strategy to run to find potential duplicates.
   */
  ['find-duplicate']?: IGeneratorFindDuplicateStrategy;
  /**
   * Strategy to run when we find a duplicate item.
   */
  ['on-duplicate']?: IGeneratorOnDuplicateStrategy;
}

export interface IFindDuplicateParameters {
  /**
   * The time in seconds (default to `60`). For example, `debounce-duration` is `86400`, then if two event is created within 1 day, then it is a duplicate.
   */
  ['debounce-duration']?: number;
  /**
   * Use the generator title as the condition to find the duplicate event.
   */
  ['debounce-generator-title']?: 'yes' | 'no';
  /**
   * Choose between `or` and `and` (default to `and`). If `or`, then only one of the title above is enough to find the duplicate event. If `and`, then both of the title is needed to find the duplicate event.
   */
  ['debounce-tiddler-condition']?: 'or' | 'and';
  /**
   * Use the tiddler title that trigger the event as the condition to find the duplicate event.
   */
  ['debounce-tiddler-title']?: 'yes' | 'no';
  /**
   * The filter expression to find the duplicate event.
   *
   * 1. variable `currentTiddler` is the title of the tiddler that trigger the event.
   * 1. variable `currentIndex` is the index of the current item we are checking.
   * 1. variable `currentLog` is the title of the log file we are checking. Use json filter operators with `currentIndex` to get the current log item.
   *
   * You can use them to compare the current event with the event in the log file one by one. Return `yes` means it is a duplicate.
   *
   * Not sure if this will be slow.
   */
  ['find-duplicate-filter']?: string;
}

/**
 * The strategy to handle the duplicate event (same title and same event type) already exist in the log cache and the archive log.
 *
 * Default to `overwrite`.
 */
export enum IGeneratorOnDuplicateStrategy {
  /**
   * When the tiddler that trigger the event is already in the log cache, append the new one to coexist the old one.
   */
  append = 'append',
  /**
   * When the tiddler that trigger the event is already in the log cache, ignore the new one.
   * This is the default behavior.
   */
  ignore = 'ignore',
  /**
   * When the tiddler that trigger the event is already in the log cache, overwrite the old one.
   * // TODO: Overwrite need to handle the case that item is already used, and exist in readonly archive log. So skip this feature for now.
   */
  overwrite = 'overwrite',
}

/**
 * We hard code some strategy to find duplicate event (to speed up and make it simpler, instead use filter expression for everything).
 *
 * Will use `IFindDuplicateParameters` for the parameters.
 */
export enum IGeneratorFindDuplicateStrategy {
  /**
   * Based on same generator/tiddler title, if two event is created within some time, then it is a duplicate.
   *
   * Related fields:
   *
   * - `debounce-duration`
   * - `debounce-generator-title
   * - `debounce-tiddler-title`
   * - `debounce-tiddler-condition`
   */
  'debounce' = 'debounce',
  /**
   * //TODO: Run a filter expression with some variables to find the duplicate event.
   *
   * Will use `find-duplicate-filter` field to get the filter expression.
   */
  filter = 'filter',
}
