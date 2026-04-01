import { randomBytes } from 'crypto';

/** URL-safe token for magic login links (store in User.otp). */
export function createMagicLoginToken(): string {
  return randomBytes(32).toString('hex');
}
