
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
   * (default to `yes`)
   */
  ['debounce-generator-title']?: 'yes' | 'no';
  /**
   * Choose between `or` and `and` (default to `and`). If `or`, then only one of the title above is enough to find the duplicate event. If `and`, then both of the title is needed to be duplicate to find the duplicate event.
   */
  ['debounce-tiddler-condition']?: 'or' | 'and';
  /**
   * Use the tiddler title that trigger the event as the condition to find the duplicate event.
   * (default to `no`) If set to 'yes' will cause log based debounce not working.
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
