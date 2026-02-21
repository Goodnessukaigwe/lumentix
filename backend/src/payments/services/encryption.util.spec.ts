import { encrypt, decrypt } from './encryption.util';

describe('encryption.util', () => {
  const secret = 'test-secret-key';
  const plaintext = 'SESCROW_SECRET_STELLAR_KEY_ABC123';

  it('encrypts to a colon-delimited string with 3 parts', () => {
    const result = encrypt(plaintext, secret);
    expect(result.split(':').length).toBe(3);
  });

  it('decrypts back to the original plaintext', () => {
    const encrypted = encrypt(plaintext, secret);
    expect(decrypt(encrypted, secret)).toBe(plaintext);
  });

  it('produces different ciphertext each time (random IV)', () => {
    const a = encrypt(plaintext, secret);
    const b = encrypt(plaintext, secret);
    expect(a).not.toBe(b);
  });

  it('throws when the ciphertext is tampered with', () => {
    const encrypted = encrypt(plaintext, secret);
    const parts = encrypted.split(':');
    parts[2] = parts[2].replace(/^../, 'ff'); // corrupt ciphertext
    expect(() => decrypt(parts.join(':'), secret)).toThrow();
  });

  it('throws with wrong decryption secret', () => {
    const encrypted = encrypt(plaintext, secret);
    expect(() => decrypt(encrypted, 'wrong-secret')).toThrow();
  });

  it('throws on malformed encrypted value', () => {
    expect(() => decrypt('not-valid', secret)).toThrow(
      'Invalid encrypted value format.',
    );
  });
});
