import { EventGeneratorDefinitions } from '../reality-event-generator/baseRealityEventGeneratorType';
import { processAmount, processMessage } from '../reality-event-generator/processFields';
import { BasicRealityEventTypes, IRealityEvent } from '../reality-event-generator/reality-event-types/RealityEventTypes';
import { IAddRealityEventParameterObjectFromJSEventItem } from './RealityEventCacheTypes';

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
    configs: eventGenerator,
  });
}
