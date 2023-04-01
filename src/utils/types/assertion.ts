export function has<T extends object, TKey extends keyof T>(
  obj: T,
  key: TKey,
): obj is T & Required<Pick<T, TKey>> {
  return key in obj && obj[key] !== undefined;
}
