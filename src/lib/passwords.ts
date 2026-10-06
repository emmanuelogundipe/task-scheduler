// ============================================================
// Password hashing — bcrypt. Kept separate from session/next
// concerns so it can be unit-tested in isolation.
// ============================================================

import bcrypt from 'bcryptjs';

export async function hashPasscode(passcode: string): Promise<string> {
  return bcrypt.hash(passcode, 10);
}

export async function verifyPasscode(passcode: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(passcode, hash);
  } catch {
    return false;
  }
}

/** Constant-time-ish credential check used by the login route. */
export async function checkCredentials(
  input: { whatsapp: string; passcode: string },
  expected: { whatsapp: string; passcodeHash: string }
): Promise<boolean> {
  const normalize = (v: string) => String(v ?? '').replace(/[^\d]/g, '');
  const numberMatches = normalize(input.whatsapp) === normalize(expected.whatsapp);
  const passMatches = await verifyPasscode(String(input.passcode), expected.passcodeHash);
  return numberMatches && passMatches;
}
