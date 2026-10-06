// ============================================================
// Authentication — bcrypt password hashing + secure httpOnly
// cookie sessions backed by the database. No external identity
// providers of any kind.
// ============================================================

import { cookies } from 'next/headers';
import crypto from 'crypto';
import { prisma } from './prisma';

const COOKIE_NAME = 'odyssey_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export { hashPasscode, verifyPasscode, checkCredentials } from './passwords';

export async function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.session.create({
    data: { token, userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
  return token;
}

export async function getSessionUser() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (session.user.status !== 'ACTIVE') return null;
  return session.user;
}

export async function destroySession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (token) await prisma.session.deleteMany({ where: { token } });
  cookies().delete(COOKIE_NAME);
}
