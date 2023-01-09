import { Logger } from '@nestjs/common';

import { isUUID } from 'class-validator';
import {
  AbstractDataType,
  AbstractDataTypeConstructor,
  DataTypes,
  Model,
  ModelAttributeColumnOptions,
  Utils,
  ValidationError,
} from 'sequelize';

import { bin2Hex, bin2UUID, hex2UUID, isHexUuid, UUID2Hex } from '@util/uuid';

interface BinaryDataTypeOptions {
  length: number;
  encoding?: BufferEncoding;
}
interface BinaryDataType extends AbstractDataType {}
interface BinaryDataTypeConstructor extends AbstractDataTypeConstructor {
  new (length: number, encoding?: BufferEncoding): BinaryDataType;
  new (options: BinaryDataTypeOptions): BinaryDataType;
  (length: number, encoding?: BufferEncoding): BinaryDataType;
  (options: BinaryDataTypeOptions): BinaryDataType;

  UUID: BinaryUuidDataTypeConstructor;
}

const OriginalABSTRACT: typeof DataTypes.ABSTRACT = DataTypes.ABSTRACT.prototype.constructor;
class BinaryDataType extends OriginalABSTRACT {
  static key = 'BINARY' as const;
  key: string;

  options: BinaryDataTypeOptions;

  constructor(lengthOrOptions: number | BinaryDataTypeOptions, encoding?: BufferEncoding) {
    super();
    const options =
      typeof lengthOrOptions === 'number' ? { length: lengthOrOptions, encoding } : lengthOrOptions;

    this.options = options;
  }

  toSql() {
    return `BINARY(${this.options.length})`;
  }
  validate(value: unknown) {
    if (!Buffer.isBuffer(value))
      throw new ValidationError(`${value} is not a valid BINARY value`, []);

    return true;
  }
  _binfy(value: unknown): Buffer {
    if (Buffer.isBuffer(value)) return value;

    return Buffer.from(String(value), this.options.encoding);
  }
  _stringify(value: unknown): any {
    // Logger.log({ message: '_stringify binary column', value });
    return this._binfy(value);
  }

  _bindParam(value: unknown, options: object): any {
    // Logger.log({ message: '_bindParam binary column', value, options });
    return `X'${value}'`;
  }

  static parse(value: unknown): string {
    // Logger.log({ message: 'parse binary column', value });
    return value as string;
  }
}
export const BINARY: BinaryDataTypeConstructor = Utils.classToInvokable(BinaryDataType) as any;

class BinaryUuidDataType extends BinaryDataType {
  constructor() {
    super({ length: 16, encoding: 'hex' });
  }

  validate(value: unknown) {
    if (!isUUID(value)) throw new ValidationError(`${value} is not a valid uuid value`, []);

    return true;
  }

  _hexify(value: Buffer | string): string {
    if (Buffer.isBuffer(value)) return bin2Hex(value);
    if (isUUID(value)) return UUID2Hex(value);
    if (isHexUuid(value)) return value;
    else throw new ValidationError(`${value} is not a valid uuid value`, []);
  }

  _stringify(value: Buffer | string): any {
    // Logger.log({ message: '_stringify binary uuid column', value });
    return super._binfy(this._hexify(value));
  }

  _bindParam(value: Buffer | string, options: object) {
    // Logger.log({ message: '_bindParam binary uuid column', value });
    return `unhex('${this._hexify(value)}')`;
  }

  static parse(value: string) {
    // Logger.log({ message: 'parse binary uuid column', value });
    return hex2UUID(super.parse(value));
  }
}
interface BinaryUuidDataType extends AbstractDataType {}
interface BinaryUuidDataTypeConstructor extends AbstractDataTypeConstructor {
  new (): BinaryUuidDataType;
  (): BinaryUuidDataType;
}
BINARY.UUID = Utils.classToInvokable(
  BinaryUuidDataType,
) as unknown as BinaryUuidDataTypeConstructor;

export const BINARY_UUID = (): ModelAttributeColumnOptions => {
  return {
    type: BINARY.UUID(),
    set: function (this: Model, value: unknown, key: string) {
      if (Buffer.isBuffer(value)) {
        this.setDataValue(key, bin2UUID(value));
      }
      this.setDataValue(key, value);
    } as any,
    get: function (this: Model, key: string) {
      const value = this.getDataValue(key);
      if (Buffer.isBuffer(value)) return bin2UUID(value);
      return value;
    } as any,
  };
};

export const JSON_STRING = (
  type: ModelAttributeColumnOptions['type'] = DataTypes.STRING,
): ModelAttributeColumnOptions => {
  return {
    type,
    validate: {
      isJSONString(value: unknown) {
        if (typeof value !== 'string') throw new Error('JSON_STRING must be string');
        try {
          JSON.parse(value);
        } catch (e) {
          throw new Error('JSON_STRING must be valid JSON string');
        }
        return true;
      },
    },
    get: function (this: Model, key: string) {
      const value = this.getDataValue(key);
      if (typeof value !== 'string') return value;

      try {
        return JSON.parse(value);
      } catch (error) {
        Logger.error({ message: 'JSON_ARRAY_STRING get invalid json string value', error, value });
        return value;
      }
    } as any,
    set: function (this: Model, value: unknown, key: string) {
      try {
        if (value === null) this.setDataValue(key, null);
        if (typeof value === 'string') return this.setDataValue(key, value);

        this.setDataValue(key, JSON.stringify(value));
      } catch (error) {
        throw new ValidationError(`${value} is not a valid JSON object`, []);
      }
    } as any,
  };
};
