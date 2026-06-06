import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const BCRYPT_SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '24h';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string, role: 'midwife' | 'obgyn' | 'admin'): string {
  return jwt.sign(
    { userId, role },
    config.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}
