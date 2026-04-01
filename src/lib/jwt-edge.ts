import { jwtVerify } from 'jose';
import type { Role } from '@/types';

/**
 * HS256 verification using Web Crypto (Edge-safe). Tokens must be issued with the same
 * secret string as `jsonwebtoken` in `@/lib/auth` (Node API routes).
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export type AuthPayload = {
  id: string;
  email: string;
  role: Role;
  isVerified?: boolean;
};

function secretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

export async function verifyTokenEdge(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    const id = typeof payload.id === 'string' ? payload.id : null;
    const email = typeof payload.email === 'string' ? payload.email : null;
    const role = typeof payload.role === 'string' ? (payload.role as Role) : null;
    if (!id || !email || !role) return null;
    const isVerified =
      payload.isVerified === false ? false : payload.isVerified === true ? true : true;
    return { id, email, role, isVerified };
  } catch {
    return null;
  }
}
