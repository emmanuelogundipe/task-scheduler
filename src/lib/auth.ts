import { cookies } from 'next/headers';
import crypto from 'crypto';
import { prisma } from './prisma';

const COOKIE_NAME = 'ts_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createSession(adminId: number) {
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.session.create({
    data: { token, adminId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function getSessionAdmin() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { admin: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.admin;
}

export async function destroySession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (token) await prisma.session.deleteMany({ where: { token } });
  cookies().delete(COOKIE_NAME);
}
