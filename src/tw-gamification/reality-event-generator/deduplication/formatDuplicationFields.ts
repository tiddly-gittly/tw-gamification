/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { filterNecessaryConfig } from '../../reality-event-cache/buildRealityEventCacheItem';
import { IAddRealityEventParameterObjectFromActionWidget, IAddRealityEventParameterObjectFromJSEventItem } from '../../reality-event-cache/RealityEventCacheTypes';
import { IDuplicationStrategy, IFindDuplicateParameters } from './DuplicationHandlerTypes';

export function formatDuplicationFields(
  input: IAddRealityEventParameterObjectFromActionWidget | IAddRealityEventParameterObjectFromJSEventItem,
): IDuplicationStrategy & IFindDuplicateParameters & Required<Pick<IFindDuplicateParameters, 'debounce-duration'>> {
  const configs = filterNecessaryConfig(input.configs);
  configs['debounce-tiddler-title'] = configs['debounce-tiddler-title'] || 'no';
  configs['debounce-generator-title'] = configs['debounce-generator-title'] || 'yes';
  configs['debounce-tiddler-condition'] = configs['debounce-tiddler-condition'] || 'and';
  return {
    ...configs,
    'debounce-duration': (configs['debounce-duration'] && Number.isFinite(Number(configs['debounce-duration']))) ? 1000 * Number(configs['debounce-duration']) : 1000 * 60,
  };
}
