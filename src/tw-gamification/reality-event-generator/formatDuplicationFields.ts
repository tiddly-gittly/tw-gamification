/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { pick } from 'lodash';
import { IAddRealityEventParameterObjectFromActionWidget, IAddRealityEventParameterObjectFromJSEventItem } from '../reality-event-cache/RealityEventCacheTypes';
import { IDuplicationStrategy, IFindDuplicateParameters } from './DuplicationHandlerTypes';

export function formatDuplicationFields(
  input: IAddRealityEventParameterObjectFromActionWidget | IAddRealityEventParameterObjectFromJSEventItem,
): IDuplicationStrategy & IFindDuplicateParameters & Required<Pick<IFindDuplicateParameters, 'debounce-duration'>> {
  const configs = pick(input.configs, [
    'on-duplicate',
    'find-duplicate',
    'debounce-duration',
    'debounce-generator-title',
    'debounce-tiddler-condition',
    'debounce-tiddler-title',
    'find-duplicate-filter',
  ]);
  configs['debounce-tiddler-title'] = configs['debounce-tiddler-title'] || 'yes';
  configs['debounce-generator-title'] = configs['debounce-generator-title'] || 'yes';
  configs['debounce-tiddler-condition'] = configs['debounce-tiddler-condition'] || 'and';
  return {
    ...configs,
    'debounce-duration': (configs['debounce-duration'] && Number.isFinite(Number(configs['debounce-duration']))) ? 1000 * Number(configs['debounce-duration']) : 1000 * 60,
  };
}
