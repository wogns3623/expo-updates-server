import { Model, NonAttribute } from 'sequelize';
import { ModelHooks } from 'sequelize/types/hooks';

type IsNever<T> = [T] extends [never] ? true : false;
type IsAny<T> = 0 extends 1 & T ? true : false;
type IsUnknown<T> = IsAny<T> extends true ? false : unknown extends T ? true : false;

type NonAttributeBrandSymbol = keyof NonAttribute<{}>;
type IsBranded<T, Brand extends symbol> = keyof NonNullable<T> extends keyof Omit<
  NonNullable<T>,
  Brand
>
  ? false
  : true;

type IsAllAttributeKey<TModel, TKey> = TKey extends keyof TModel
  ? TKey extends 'constructor'
    ? false
    : TModel[TKey] extends (...args: any[]) => any // functions are always excluded
    ? false
    : TKey extends keyof Model // fields inherited from Model are all excluded
    ? false
    : TKey extends symbol
    ? false
    : true
  : false;
type InferAllAttributeKey<TModel, TKey> = IsAllAttributeKey<TModel, TKey> extends false
  ? never
  : TKey;

/** NonAttribute까지 포함됨 */
export type AllAttributes<TModel> = {
  [Key in keyof TModel as InferAllAttributeKey<TModel, Key>]: TModel[Key];
};

type AddNullableToProperAttribute<TAttr> = NonNullable<TAttr> extends Model
  ? TAttr | null
  : NonNullable<TAttr> extends Model[]
  ? TAttr
  : TAttr extends undefined
  ? TAttr | null
  : TAttr;

type InferAttributesOptions<TModel> = {
  inferNullable?: boolean;
  omittedKeys?: keyof TModel;
  optionalKeys?: keyof TModel;
};

type ParseInferAttributesOptions<TOpt extends InferAttributesOptions<any>> = {
  inferNullable: IsUnknown<NonNullable<TOpt['inferNullable']>> extends true
    ? true
    : NonNullable<TOpt['inferNullable']>;
  omittedKeys: IsUnknown<NonNullable<TOpt['omittedKeys']>> extends true
    ? never
    : NonNullable<TOpt['omittedKeys']>;
  optionalKeys: IsUnknown<NonNullable<TOpt['optionalKeys']>> extends true
    ? never
    : NonNullable<TOpt['optionalKeys']>;
};

type IsModelAttributeKey<TModel, TKey extends keyof TModel> = IsAllAttributeKey<
  TModel,
  TKey
> extends false
  ? false
  : IsBranded<TModel[TKey], NonAttributeBrandSymbol> extends true
  ? false
  : true;
type InferModelAttributeKey<TModel, TKey extends keyof TModel> = IsModelAttributeKey<
  TModel,
  TKey
> extends false
  ? never
  : TKey;

export type InferModelAttributes<TModel> = {
  [P in keyof TModel as InferModelAttributeKey<TModel, P>]: AddNullableToProperAttribute<TModel[P]>;
};
type IsJoinedAttributeKey<TModel, TKey extends keyof TModel> = NonNullable<
  TModel[TKey]
> extends Model
  ? true
  : NonNullable<TModel[TKey]> extends Model[]
  ? true
  : false;

type InferJoinedAttributeKey<TModel, TKey extends keyof TModel> = IsModelAttributeKey<
  TModel,
  TKey
> extends false
  ? never
  : IsJoinedAttributeKey<TModel, TKey> extends false
  ? never
  : TKey;

export type JoinedAttributes<TModel> = {
  [P in keyof TModel as InferJoinedAttributeKey<TModel, P>]: AddNullableToProperAttribute<
    TModel[P]
  >;
};

type InferColumnAttributeKey<TModel, TKey extends keyof TModel> = IsModelAttributeKey<
  TModel,
  TKey
> extends false
  ? never
  : IsJoinedAttributeKey<TModel, TKey> extends true
  ? never
  : TKey;

export type ColumnAttributes<TModel> = {
  [P in keyof TModel as InferColumnAttributeKey<TModel, P>]: AddNullableToProperAttribute<
    TModel[P]
  >;
};

type _InferModelCreationAttributes<
  TModel,
  TOpt extends InferAttributesOptions<TModel>,
  TOmittedKeys extends keyof TModel = NonNullable<TOpt['omittedKeys']>,
  TOptionalKeys extends keyof TModel = NonNullable<TOpt['optionalKeys']>,
> = {
  [P in keyof TModel as P extends TOmittedKeys
    ? never
    : P extends TOptionalKeys
    ? never
    : InferColumnAttributeKey<TModel, P>]: AddNullableToProperAttribute<TModel[P]>; // required attributes
} & {
  [P in keyof TModel as P extends TOmittedKeys
    ? never
    : P extends TOptionalKeys
    ? P
    : never]?: AddNullableToProperAttribute<TModel[P]>; // optional attributes
} & {
  [P in keyof TModel as P extends TOmittedKeys
    ? never
    : InferJoinedAttributeKey<TModel, P>]?: NonNullable<TModel[P]> extends (infer TVal)[]
    ? InferModelCreationAttributes<TVal>[]
    : InferModelCreationAttributes<NonNullable<TModel[P]>>;
};

export type InferModelCreationAttributes<
  T,
  TOpt extends InferAttributesOptions<T> = {},
> = _InferModelCreationAttributes<T, ParseInferAttributesOptions<TOpt>>;

// interface Foo extends Model {
//   id: number;
//   createdAt: Date;
//   updatedAt: Date;
//   deletedAt?: Date;

//   size?: string;
//   hash?: string;
//   /** @default 1 */
//   revisionEnable?: number;
//   expiredAt: Date;

//   barId?: number;
//   bar?: Bar;

//   bazId?: number;
//   baz?: Baz;

//   someModels?: SomeModel[];
//   someOtherModels?: SomeOtherModel[];
// }

// interface Bar extends Model {}
// interface Baz extends Model {}
// interface SomeModel extends Model {}
// interface SomeOtherModel extends Model {}

// type JoinedAttributesFoo = JoinedAttributes<Foo>;
// type InferModelAttributesFoo = InferAttributes<Foo>;
// type InferModelCreationAttributesFoo = InferModelCreationAttributes<Foo>;
// type InferModelCreationAttributesFooOptional = InferModelCreationAttributes<
//   Foo,
//   { optionalKeys: 'id' | 'createdAt' | 'updatedAt' }
// >['_debug'];

type ModelResultOptions<TModel extends Model> = {
  [P in keyof TModel as InferAllAttributeKey<TModel, P>]?:
    | boolean
    | null
    | (TModel[P] extends Model
        ? ModelResultOptions<TModel[P]>
        : TModel[P] extends Model[]
        ? ModelResultOptions<TModel[P][number]>
        : never);
} & {
  /** @default false */
  _required?: boolean | null;
  /** @default false */
  _only?: boolean;
};

type IsRequiredAttribute<
  TModel extends Model,
  TOptions extends ModelResultOptions<any>,
  TKey extends keyof TModel,
> = TKey extends keyof TOptions
  ? TOptions[TKey] extends true
    ? true
    : TOptions[TKey] extends { _required?: boolean }
    ? true
    : false
  : false;

type HasNestedOptions<
  TModel extends Model,
  TOptions extends ModelResultOptions<any>,
  TKey extends keyof TModel,
> = TKey extends keyof TOptions
  ? TOptions[TKey] extends ModelResultOptions<any>
    ? true
    : false
  : false;

export type ModelResult<
  TModel extends Model,
  TOptions extends ModelResultOptions<TModel>,
> = TModel & {
  [TKey in keyof TModel as IsRequiredAttribute<TModel, TOptions, TKey> extends true
    ? TKey
    : never]-?: TKey extends keyof TOptions
    ? NonNullable<TModel[TKey]> extends Model
      ? TOptions[TKey] extends ModelResultOptions<NonNullable<TModel[TKey]>>
        ? ModelResult<NonNullable<TModel[TKey]>, TOptions[TKey]>
        : NonNullable<TModel[TKey]>
      : NonNullable<TModel[TKey]>
    : NonNullable<TModel[TKey]>;
};

export type HookHandler<TModel extends Model, HookName extends keyof ModelHooks<TModel>> = (
  ...args: Parameters<ModelHooks<TModel>[HookName]>
) => ReturnType<ModelHooks<TModel>[HookName]>;
