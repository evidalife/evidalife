import { createHmac } from 'crypto';
import { cookies } from 'next/headers';

const SECRET = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'lab-portal-secret';

export interface LabSession {
  labId: string;
  labName: string;
  labCode: string;
}

/** Create a signed token for the lab session (24h expiry) */
export function createLabToken(session: LabSession): string {
  const payload = {
    ...session,
    exp: Math.floor(Date.now() / 1000) + 86400, // 24h
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

/** Verify and decode a lab token */
function verifyToken(token: string): LabSession | null {
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;

  const expectedSig = createHmac('sha256', SECRET).update(data).digest('base64url');
  if (sig !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { labId: payload.labId, labName: payload.labName, labCode: payload.labCode };
  } catch {
    return null;
  }
}

/** Get the current lab session from the cookie */
export async function getLabSession(): Promise<LabSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('lab-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}
