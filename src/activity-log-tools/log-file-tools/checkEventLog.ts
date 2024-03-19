/* eslint-disable @typescript-eslint/strict-boolean-expressions */

export function isValidLogData(data: ReturnType<typeof $tw.wiki.getTiddlerData>): data is Record<string, string> {
  if (!data || Array.isArray(data)) {
    return false;
  }
  return true;
}
