import crypto, { BinaryToTextEncoding } from 'crypto';

export function createHash(file: Buffer, hashingAlgorithm: string, encoding: BinaryToTextEncoding) {
  return crypto.createHash(hashingAlgorithm).update(file).digest(encoding);
}

export function signRSASHA256(data: string, privateKey: string) {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(data, 'utf8');
  sign.end();
  return sign.sign(privateKey, 'base64');
}
