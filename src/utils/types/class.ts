import { includes } from '@util/array';

import { Include, NonMatchKeys, OmitValue } from './types';

export type AbstractConstructor<T = any, TA extends any[] = any[]> = abstract new (
  ...args: TA
) => T;
export type Constructor<T = any, TA extends any[] = any[]> = new (...args: TA) => T;

export type InstanceOf<TClass extends new (...args: any) => any> = TClass extends new (
  ...args: any
) => infer R
  ? R
  : any;

/**
 * @summary Methods of Class
 */
export type MethodsOf<TClass> = keyof TClass extends infer K
  ? K extends keyof TClass
    ? TClass[K] extends (...args: any[]) => any
      ? K
      : never
    : never
  : never;

/**
 * @summary Member variables of Class
 */
export type MembersOf<TClass> = keyof TClass extends infer K
  ? K extends keyof TClass
    ? TClass[K] extends (...args: any[]) => any
      ? never
      : K
    : never
  : never;

export type NonConstructorKeys<TClass> = NonMatchKeys<TClass, Constructor | AbstractConstructor>;

export type OmitConstructor<TClass> = OmitValue<TClass, Constructor | AbstractConstructor>;

const doNothing = () => undefined;

export type ClassStaticDecorator<T> = (target: T) => void;

/**
 * @summary class decorator to enforce static properties
 */
export function ClassStatic<T>() {
  return doNothing as ClassStaticDecorator<T>;
}

/**
 * @example
 * ```typescript
 * interface AStaticImpl {}
 *
 * interface AStaticMixin {}
 *
 * @ClassStatic<AStaticImpl>()
 * class A {}
 *
 * // mixin some static properties
 *
 * // define class(constructor) value & type
 * const CompleteA = A as Class<A, typeof A & AStaticMixin>
 * // define instance type
 * type CompleteA = A
 *
 * // using CompleteA as a class
 *
 * const a = new CompleteA()
 *
 * interface WithA<T extends CompleteA> {
 *   a: T
 * }
 *
 * type AConstructor = typeof CompleteA
 * ```
 */
export type Class<TClassInstance, TClassStatic extends object> = TClassStatic extends
  | Constructor
  | AbstractConstructor
  ? // TClassStatic contain constructor
    OmitConstructor<TClassStatic> &
      Constructor<InstanceType<TClassStatic> & TClassInstance, ConstructorParameters<TClassStatic>>
  : TClassStatic & Constructor<TClassInstance>;

export type AbstractClass<TClassInstance, TClassStatic extends object> = TClassStatic extends
  | Constructor
  | AbstractConstructor
  ? // TClassStatic contain constructor
    OmitConstructor<TClassStatic> &
      AbstractConstructor<
        InstanceType<TClassStatic> & TClassInstance,
        ConstructorParameters<TClassStatic>
      >
  : TClassStatic & AbstractConstructor<TClassInstance>;

/**
 * @summary helper function to mixin static properties or mixed static property types
 *
 * @example
 * ```typescript
 * class A {
 *   a: string;
 *   static sa: string;
 * }
 *
 * class BStaticMixin extends MixinStatic(A, {
 *   mixinStaticB: false,
 *   mixinStaticFn() {
 *     return { sa: this.sa, sb: this.sb };
 *   },
 * }) {}
 *
 * BStaticMixin.mixinStaticFn;
 * BStaticMixin.sa;
 * const bStaticMixin = new BStaticMixin();
 *
 * BStaticMixin.prototype.a;
 * bStaticMixin.a;
 * ```
 */
export function MixinStatic<
  TClass extends Constructor | AbstractConstructor,
  TStaticMixin extends object,
>(Base: TClass, staticProperties?: TStaticMixin & ThisType<TStaticMixin & TClass>) {
  if (staticProperties)
    Object.defineProperties(Base, Object.getOwnPropertyDescriptors(staticProperties));

  return Base as Class<{}, TClass & TStaticMixin>;
}

/**
 * @summary helper function to mixin properties or define mixed property types
 *
 * @example
 * ```typescript
 * class A {
 *   a: string;
 *   static sa: string;
 * }
 *
 * class BMixin extends Mixin(A, {
 *   mixinB: true,
 *   mixinFn() {
 *     return { a: this.a, b: this.b };
 *   },
 * }) {}
 *
 * class BStaticMixin extends MixinStatic(BMixin, {
 *   mixinStaticB: false,
 *   mixinStaticFn() {
 *     return { sa: this.sa, sb: this.sb };
 *   },
 * }) {}
 *
 * const b = new BMixin();
 * b.mixinFn;
 * b.a
 * BMixin.sa
 * ```
 */
export function Mixin<
  TClass extends Constructor | AbstractConstructor,
  TMixin extends object = {},
  TStaticMixin extends object = {},
>(
  Base: TClass,
  properties?: TMixin & ThisType<TMixin & InstanceType<TClass>>,
  staticProperties?: TStaticMixin & ThisType<TStaticMixin & TClass>,
) {
  if (properties)
    Object.defineProperties(Base.prototype, Object.getOwnPropertyDescriptors(properties));
  if (staticProperties)
    Object.defineProperties(Base, Object.getOwnPropertyDescriptors(staticProperties));

  return Base as Class<TMixin, TClass & TStaticMixin>;
}

export declare const constructorSymbol: unique symbol;
export interface ConstructorMixin<TStatic = Function> {
  [constructorSymbol]: TStatic;
}

export type InferConstructor<T extends Object> = T extends ConstructorMixin
  ? NonNullable<T[typeof constructorSymbol]>
  : T['constructor'];

export function isConstructible<T>(value: T): value is Include<T, Constructor>;
export function isConstructible(value: any): boolean {
  return (
    includes(['object', 'function'], typeof value) &&
    !!value.prototype &&
    !!value.prototype.constructor
  );
}
