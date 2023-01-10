import {
  ClassTransformOptions,
  instanceToPlain,
  plainToInstance,
  Transform,
} from 'class-transformer';
import {
  registerDecorator,
  validate,
  validateSync,
  ValidationArguments,
  ValidationError,
  ValidationOptions,
  ValidatorConstraintInterface,
  ValidatorOptions,
} from 'class-validator';
import { nanoid } from 'nanoid';

import { ArrayOr, arrayOrToArray } from './types';

type ClassConstructor<T> = { new (...args: any[]): T };

export interface ValidateOptions {
  transformToInstanceOptions?: ClassTransformOptions;
  transformToPlainOptions?: ClassTransformOptions;
  validateOptions?: ValidatorOptions;
  /** @default false */
  sync?: boolean;
  /** @default true */
  transform?: boolean;

  exceptionFactory?: (errors: ValidationError[]) => any;
}

export interface SyncValidator<T extends object, V extends object> {
  (val: V, options?: ValidateOptions): T;
  (val: V[], options?: ValidateOptions): T[];
}
export interface AsyncValidator<T extends object, V extends object> {
  (val: V, options?: ValidateOptions): Promise<T>;
  (val: V[], options?: ValidateOptions): Promise<T[]>;
}

export type Validator<
  T extends object,
  V extends object,
  Opt extends ValidateOptions = ValidateOptions,
> = Opt['sync'] extends true ? SyncValidator<T, V> : AsyncValidator<T, V>;

export function createValidator<
  T extends object,
  V extends object,
  Opt extends ValidateOptions = ValidateOptions,
>(
  cls: ClassConstructor<T>,
  {
    transformToInstanceOptions: outerTransformToInstanceOptions,
    transformToPlainOptions: outerTransformToPlainOptions,
    validateOptions: outerValidateOptions,
    sync,
    transform = true,
    exceptionFactory = e => e,
  }: Opt = {} as Opt,
): Validator<T, V, Opt> {
  return ((
    val: any,
    {
      transformToInstanceOptions: innerTransformToInstanceOptions,
      transformToPlainOptions: innerTransformToPlainOptions,
      validateOptions: innerValidateOptions,
    }: ValidateOptions = {},
  ) => {
    const instance = plainToInstance(cls, val, {
      enableImplicitConversion: true,
      ...outerTransformToInstanceOptions,
      ...innerTransformToInstanceOptions,
    });

    const plain = instanceToPlain(instance, {
      enableImplicitConversion: true,
      ...outerTransformToPlainOptions,
      ...innerTransformToPlainOptions,
    }) as V;

    if (!sync) {
      return new Promise<T | V>(async (resolve, reject) => {
        const errors = await validate(instance, {
          skipMissingProperties: false,
          ...outerValidateOptions,
          ...innerValidateOptions,
        });

        if (errors.length > 0) return reject(exceptionFactory(errors));

        if (transform) return resolve(instance);
        return resolve(plain);
      });
    } else {
      const errors = validateSync(instance, {
        skipMissingProperties: false,
        ...outerValidateOptions,
        ...innerValidateOptions,
      });

      if (errors.length > 0) throw exceptionFactory(errors);

      if (transform) return instance;
      return plain;
    }
  }) as Validator<T, V, Opt>;
}

export function TransformBooleanString() {
  return Transform(({ obj, key }) => {
    if (obj[key] === true || obj[key] === 'true') return true;
    if (obj[key] === false || obj[key] === 'false') return false;
    return obj[key];
  });
}

export function TransformEmptyString() {
  return Transform(({ value }) => (value === '' ? undefined : value));
}

export function TransformJsonString() {
  return Transform(({ value }) => {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  });
}

export function OneOfRequire(properties: ArrayOr<string>, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'OneOfRequire',
      target: object.constructor,
      propertyName,
      constraints: arrayOrToArray(properties) as string[],
      options: validationOptions,
      validator: {
        validate(value, args: any) {
          const relatedPropertyNames = args.constraints;

          const isAnyExist = relatedPropertyNames.reduce(
            (prev: boolean, curr: any) => args.object[curr] !== undefined || prev,
            false,
          ) as boolean;

          return value !== undefined || isAnyExist; // you can return a Promise<boolean> here as well, if you want to make async validation
        },

        defaultMessage(args: any) {
          return `${args.property} must not be undefined if all other properties(${args.constraints}) are undefined`;
        },
      },
    });
  };
}

type ValidatorFn = (
  value: any,
  validationArguments?: ValidationArguments,
) => Promise<boolean> | boolean;

export function CustomValidate(
  validator: ValidatorConstraintInterface | ValidatorFn,
  validationOptions?: ValidationOptions,
) {
  if (typeof validator === 'function') validator = { validate: validator };

  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: `CustomValidate_${nanoid(8)}`,
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator,
    });
  };
}
