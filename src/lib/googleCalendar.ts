// ============================================================
// Google Calendar Service — googleapis OAuth2
// Handles the connect/relink flow and event creation.
// ============================================================

import { google } from 'googleapis';
import { prisma } from './prisma';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/api/google/callback';

export function googleConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

function oauth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

/** Step 1 — URL the admin is redirected to for OAuth consent. */
export function getAuthUrl() {
  return oauth2Client().generateAuthUrl({
    access_type: 'offline', // request a refresh token
    prompt: 'consent', // force consent so we always get a refresh token
    scope: ['https://www.googleapis.com/auth/calendar'],
  });
}

/** Step 2 — exchange the callback code for tokens and store them. */
export async function exchangeCode(code: string) {
  const client = oauth2Client();
  const { tokens } = await client.getToken(code);

  const admin = await prisma.admin.findFirst();
  if (!admin) throw new Error('Admin record not found');

  // Best-effort: fetch the connected account's email for display
  let googleEmail: string | null = null;
  try {
    const auth = oauth2Client();
    auth.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth });
    const me = await oauth2.userinfo.get();
    googleEmail = me.data.email ?? null;
  } catch {
    /* non-fatal */
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: { googleTokens: JSON.stringify(tokens), googleEmail },
  });

  return tokens;
}

/** Build an authenticated calendar client from stored tokens. */
async function getCalendar() {
  const admin = await prisma.admin.findFirst();
  if (!admin?.googleTokens) return null;
  const client = oauth2Client();
  client.setCredentials(JSON.parse(admin.googleTokens));
  // googleapis auto-refreshes the access token using the refresh token
  return google.calendar({ version: 'v3', auth: client });
}

export async function isGoogleConnected() {
  const admin = await prisma.admin.findFirst();
  return Boolean(admin?.googleTokens);
}

export async function getGoogleEmail() {
  const admin = await prisma.admin.findFirst();
  return admin?.googleEmail ?? null;
}

export interface CalendarEventInput {
  summary: string;
  description: string;
  start: Date;
  end: Date;
}

/** Create an event on Engr. Mrs. Stella's primary calendar. */
export async function createCalendarEvent(
  opts: CalendarEventInput
): Promise<{ ok: boolean; id?: string; link?: string; error?: string }> {
  const calendar = await getCalendar();
  if (!calendar) {
    return { ok: false, error: 'Google Calendar not connected' };
  }

  try {
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: opts.summary,
        description: opts.description,
        start: { dateTime: opts.start.toISOString(), timeZone: 'Africa/Lagos' },
        end: { dateTime: opts.end.toISOString(), timeZone: 'Africa/Lagos' },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 30 },
            { method: 'popup', minutes: 10 },
          ],
        },
      },
    });
    return { ok: true, id: res.data.id ?? undefined, link: res.data.htmlLink ?? undefined };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Calendar API error' };
  }
}
