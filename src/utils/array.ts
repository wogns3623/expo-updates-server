import { isArray } from './types';

export type CompFn<T1, T2> = (a: T1, b: T2) => boolean;
export type ConvertFn<T1, T2> = (a: T1) => T2;

export function includes<T>(arr: Iterable<T>, value: any): value is T;
export function includes<T>(arr: Iterable<T>, value: any, comp?: CompFn<T, any>): value is T;
export function includes(
  arr: Iterable<any>,
  value: any,
  comp: CompFn<any, any> = (a, b) => a === b,
): value is any {
  for (const v of arr) if (comp(v, value)) return true;
  return false;
}

/**
 * @description subtract
 *
 * @returns arr1 - arr2
 */
export function subtract<T>(arr1: Iterable<T>, arr2: Iterable<T>): T[];
export function subtract<T1, T2>(
  arr1: Iterable<T1>,
  arr2: Iterable<T2>,
  convert?: ConvertFn<T1, T2>,
): T1[];
export function subtract<T1, T2>(
  arr1: Iterable<T1>,
  arr2: Iterable<T2>,
  convert?: ConvertFn<T1, T2>,
) {
  const map = new Map();
  for (const item1 of arr1) map.set(convert ? convert(item1) : item1, item1);
  for (const item2 of arr2) map.has(item2) && map.delete(item2);
  return Array.from(map.values());
}

/**
 * @description intersection, 겹치는거만 남김
 *
 * @returns arr1 ∩ arr2
 */
export function intersection<T>(arr1: Iterable<T>, arr2: Iterable<T>): T[];
export function intersection<T1, T2>(
  arr1: Iterable<T1>,
  arr2: Iterable<T2>,
  convert?: ConvertFn<T1, T2>,
): T1[];
export function intersection<T1, T2>(
  arr1: Iterable<T1>,
  arr2: Iterable<T2>,
  convert?: ConvertFn<T1, T2>,
) {
  // return arr1.filter((x) => arr2.includes(x));

  const map = new Map();
  const result: T1[] = [];
  for (const item of arr1) map.set(convert ? convert(item) : item, item);
  for (const item of arr2) map.has(item) && result.push(map.get(item));
  return result;
}

/**
 * @description union
 *
 * @returns arr1 ∪ arr2
 */
export function uniq<T>(arr1: Iterable<T>): T[];
export function uniq<T>(arr1: Iterable<T>, objToKey: (obj: T) => unknown): T[];
export function uniq<T>(arr1: Iterable<T>, ...args: Iterable<T>[]): T[];
export function uniq<T>(
  arr1: Iterable<T>,
  objToKey: (obj: T) => unknown,
  ...args: Iterable<T>[]
): T[];
export function uniq(
  arr1: Iterable<any>,
  objToKeyOrArg?: Iterable<any> | ((obj: any) => unknown),
  ...args: Iterable<any>[]
): any[] {
  let objToKey = (obj: any) => obj;
  if (typeof objToKeyOrArg === 'function') objToKey = objToKeyOrArg;
  else if (objToKeyOrArg !== undefined) args.unshift(objToKeyOrArg);

  const map = new Map();
  for (const item of arr1) map.set(objToKey(item), item);
  for (const arr of args) for (const item of arr) map.set(objToKey(item), item);
  return Array.from(map.values());
}

type AssignFn<T1 = unknown, T2 = unknown, TRes = unknown> = (obj: T1, value?: T2) => TRes;
type ObjToKeyFn<T1 = unknown, TKey = unknown> = (obj: T1) => TKey;

export function assignValuesToMatchObject<T1 extends object, T2, TKey, TRes>(
  objs: T1[],
  values: T2[],
  objToKey: ObjToKeyFn<T1, TKey>,
  valueToKey: ObjToKeyFn<T2, TKey>,
  assign: AssignFn<T1, T2, TRes>,
): TRes[];
export function assignValuesToMatchObject<T1 extends object, T2, TKey, TRes>(
  objs: T1[],
  values: Map<TKey, T2>,
  objToKey: ObjToKeyFn<T1, TKey>,
  assign: AssignFn<T1, T2, TRes>,
): TRes[];
export function assignValuesToMatchObject(
  objs: object[],
  values: unknown[] | Map<unknown, unknown>,
  objToKey: ObjToKeyFn,
  valueToKey: ObjToKeyFn | AssignFn,
  assign?: AssignFn,
) {
  let valueMap: Map<unknown, unknown>;
  let assignFn: AssignFn;
  if (isArray(values)) {
    assignFn = assign as AssignFn;
    valueMap = new Map(values.map(v => [valueToKey(v), v]));
  } else {
    valueMap = values as Map<unknown, unknown>;
    assignFn = valueToKey as AssignFn;
  }

  return objs.map(obj => {
    const value = valueMap.get(objToKey(obj));
    return assignFn(obj, value);
  });
}

export function createCustomAssigner<T1 extends object, T2, TKey, TRes>(
  objToKey: (obj: T1) => TKey,
  valueToKey: (value: T2) => TKey,
  assign: (obj: T1, value?: T2) => TRes,
): (objs: T1[], values: T2[]) => TRes[];
export function createCustomAssigner(
  objToKey: (obj: object) => unknown,
  valueToKey: (value: unknown) => unknown,
  assign: (obj: object, value?: unknown) => unknown,
) {
  return (objs: object[], values: unknown[]) =>
    assignValuesToMatchObject(objs, values, objToKey, valueToKey, assign);
}
