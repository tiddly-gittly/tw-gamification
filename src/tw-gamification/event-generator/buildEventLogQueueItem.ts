import { IGameEventLogCacheItem } from '../event-queue/GamificationEventLogTypes';
import { IActionDefinitions } from './action/types';
import { BasicGamificationEventTypes, IGamificationEvent } from './GamificationEventTypes';
import { processAmount, processMessage } from './processFields';

export function buildEventLogQueueItem(eventGenerator: IActionDefinitions, tiddlerTitle?: string): IGameEventLogCacheItem {
  const { 'game-event-amount': amount, 'game-event-message': message, 'game-event-type': eventType = BasicGamificationEventTypes.SmallReward, 'game-event-id': itemID, title } =
    eventGenerator;

  const event: IGamificationEvent = {
    timestamp: Date.now(),
    id: itemID!,
    event: eventType,
    amount: processAmount(amount),
    message: processMessage(message),
  };
  return ({
    event,
    meta: {
      tiddlerTitle,
      generator: title,
    },
  });
}
