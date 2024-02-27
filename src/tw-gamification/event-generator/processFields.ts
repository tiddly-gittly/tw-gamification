/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { DEFAULT_AMOUNT } from './constants';

export function processAmount(amount: string | number | undefined): number {
  if (amount === undefined) {
    return DEFAULT_AMOUNT;
  }
  if (typeof amount === 'number' || Number.isFinite(Number(amount))) {
    return Number(amount);
  }
  // try run it as a filter expression, to see if we can get the amount number
  const amountFilteredResult = $tw.wiki.filterTiddlers(amount)?.[0];
  if (!amountFilteredResult) {
    return DEFAULT_AMOUNT;
  }
  if (Number.isFinite(Number(amountFilteredResult))) {
    return Number(amountFilteredResult);
  }
  return DEFAULT_AMOUNT;
}

export function processMessage(message: string | undefined): string | undefined {
  if (!message) return;
  // FIXME: can't get translate variable here
  return $tw.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', message);
}
