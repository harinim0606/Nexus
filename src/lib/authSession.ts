import { roleHomePath } from '@/lib/redirects';

/** Public session user (never send password hash to the client). */
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  isVerified: boolean;
};

export function toSessionUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  isVerified: boolean;
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isVerified: user.isVerified,
  };
}

/**
 * Use full navigation after login so the HttpOnly cookie from the previous response
 * is always visible to the next document + middleware (avoids client router races).
 */
export function redirectAfterSignIn(role: string | undefined | null) {
  const path = roleHomePath(role);
  if (typeof window !== 'undefined') {
    window.location.assign(path);
  }
}
