import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export function encryptWalletPrivateKey(
  privateKey: string,
  encryptionKey: string,
): string {
  const key = scryptSync(encryptionKey, 'donnation-wallet-salt', 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(privateKey, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptWalletPrivateKey(
  payload: string,
  encryptionKey: string,
): string {
  const [ivHex, tagHex, dataHex] = payload.split(':');
  const key = scryptSync(encryptionKey, 'donnation-wallet-salt', 32);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}
