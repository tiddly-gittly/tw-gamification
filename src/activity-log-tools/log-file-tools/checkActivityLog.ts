/* eslint-disable @typescript-eslint/strict-boolean-expressions */

export function isValidActivityLogData(data: ReturnType<typeof $tw.wiki.getTiddlerData>): data is Record<string, string> {
  if (!data || Array.isArray(data)) {
    return false;
  }
  return true;
}
