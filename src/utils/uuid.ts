import { isUUID } from 'class-validator';
import crypto from 'crypto';
import { nanoid as nanoidAsync } from 'nanoid/async';
import { nanoid } from 'nanoid/non-secure';

export const randomUUID = () => crypto.randomUUID();

export const UUID2Hex = (uuid: string) => {
  if (!isUUID(uuid)) throw new Error('Invalid UUID');
  return uuid.replace(/-/g, '');
};
export const UUID2Bin = (uuid: string) => Buffer.from(UUID2Hex(uuid), 'hex');

export const isHexUuid = (hex: unknown) => {
  if (typeof hex !== 'string') return false;
  return /^[0-9a-f]{32}$/i.test(hex);
};

export const bin2Hex = (bin: Buffer) => bin.toString('hex');
export const hex2UUID = (hex: string) =>
  hex.slice(0, 32).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
export const bin2UUID = (bin: Buffer) => {
  return hex2UUID(bin2Hex(bin));
};

/**
 * 11 characters needed ~139 years in order to have a 1% probability of at least one collision.
 * @see {@link https://zelark.github.io/nano-id-cc/}
 */
const NANO_ID_LENGTH = 11;

/**
 * nanoid 4.0이 cjs module을 지원하지 않아 tsc로 transpiling해서 나온 require 문법에서 터짐
 * @see {@link https://github.com/ai/nanoid/issues/364}
 */
export const shortUUIDAsync = async () => {
  return nanoidAsync(NANO_ID_LENGTH);
};

export const shortUUID = () => {
  return nanoid(NANO_ID_LENGTH);
};
