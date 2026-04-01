import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export type AuthPayload = {
  id: string;
  email: string;
  role: Role;
  /** false = student/participant must verify email before dashboard */
  isVerified?: boolean;
};

export const generateToken = (user: {
  id: string;
  email: string;
  role: string;
  isVerified?: boolean;
}): string => {
  const isVerified = user.isVerified !== false;
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role as Role, isVerified },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token: string): AuthPayload | null => {
  try {
    const p = jwt.verify(token, JWT_SECRET) as AuthPayload;
    if (p && p.isVerified === undefined) p.isVerified = true;
    return p;
  } catch {
    return null;
  }
};