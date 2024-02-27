import { IAddGamificationEventParameterObjectFromJSEventItem } from '../event-queue/GamificationEventLogTypes';
import { EventGeneratorDefinitions } from './baseEventGeneratorType';
import { BasicGamificationEventTypes, IGamificationEvent } from './GamificationEventTypes';
import { processAmount, processMessage } from './processFields';

export function buildEventLogQueueItem(eventGenerator: EventGeneratorDefinitions, tiddlerTitle?: string): IAddGamificationEventParameterObjectFromJSEventItem {
  const { 'game-event-amount': amount, 'game-event-message': message, 'game-event-type': eventType = BasicGamificationEventTypes.SmallReward, 'game-event-item': itemID, title } =
    eventGenerator;

  const event: IGamificationEvent = {
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
