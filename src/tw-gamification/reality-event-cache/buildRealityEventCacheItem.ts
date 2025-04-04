import pick from 'lodash/pick';

import { EventGeneratorDefinitions } from '../reality-event-generator/baseRealityEventGeneratorType';
import { processAmount, processMessage } from '../reality-event-generator/processFields';
import { IAddRealityEventParameterObjectFromJSEventItem } from '../types/RealityEventCacheTypes';
import { BasicRealityEventTypes, IRealityEvent } from '../types/RealityEventTypes';

export function buildRealityEventCacheItem(eventGenerator: EventGeneratorDefinitions, tiddlerTitle?: string): IAddRealityEventParameterObjectFromJSEventItem {
  const {
    'reality-event-amount': amount,
    'reality-event-message': message,
    'reality-event-type': eventType = BasicRealityEventTypes.SmallReward,
    'reality-event-item': itemID,
    title,
  } = eventGenerator;

  const event: IRealityEvent = {
    timestamp: Date.now(),
    item: itemID,
    type: eventType,
    amount: processAmount(amount),
    message: processMessage(message),
  };
  return ({
    event,
    meta: {
      tiddlerTitle,
      generator: title,
    },
    configs: filterNecessaryConfig(eventGenerator),
  });
}

export function filterNecessaryConfig(configTiddlerFields: IAddRealityEventParameterObjectFromJSEventItem['configs']): IAddRealityEventParameterObjectFromJSEventItem['configs'] {
  return pick(configTiddlerFields, [
    'on-duplicate',
    'find-duplicate',
    'debounce-duration',
    'debounce-generator-title',
    'debounce-tiddler-condition',
    'debounce-tiddler-title',
    'find-duplicate-filter',
  ]);
}
