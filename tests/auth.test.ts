import { describe, it, expect } from 'vitest';
import { hashPasscode, verifyPasscode, checkCredentials } from '@/lib/passwords';

describe('authentication credentials', () => {
  it('hashes a passcode and verifies correct credentials', async () => {
    const hash = await hashPasscode('Engstella');
    expect(hash).not.toBe('Engstella'); // never plaintext
    expect(await verifyPasscode('Engstella', hash)).toBe(true);
  });

  it('rejects an incorrect passcode', async () => {
    const hash = await hashPasscode('Engstella');
    expect(await verifyPasscode('wrong-passcode', hash)).toBe(false);
  });

  it('checks the full credential pair (number + passcode)', async () => {
    const passcodeHash = await hashPasscode('Engstella');
    const expected = { whatsapp: '+2348133226669', passcodeHash };

    expect(
      await checkCredentials({ whatsapp: '+2348133226669', passcode: 'Engstella' }, expected)
    ).toBe(true);

    expect(
      await checkCredentials({ whatsapp: '+2348133226669', passcode: 'nope' }, expected)
    ).toBe(false);

    expect(
      await checkCredentials({ whatsapp: '+2340000000000', passcode: 'Engstella' }, expected)
    ).toBe(false);
  });
});
