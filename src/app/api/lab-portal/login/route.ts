import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createHash } from 'crypto';
import { createLabToken } from '@/lib/lab-auth';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: lab } = await admin
    .from('lab_partners')
    .select('id, name, lab_code, login_username, login_password_hash')
    .eq('login_username', username)
    .eq('is_active', true)
    .single();

  if (!lab || !lab.login_password_hash) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  if (hashPassword(password) !== lab.login_password_hash) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Update last login
  await admin.from('lab_partners').update({ last_login_at: new Date().toISOString() }).eq('id', lab.id);

  // Create signed token (24h expiry)
  const token = createLabToken({ labId: lab.id, labName: lab.name, labCode: lab.lab_code ?? '' });

  const res = NextResponse.json({
    success: true,
    lab: { labId: lab.id, labName: lab.name, labCode: lab.lab_code ?? '' },
  });

  res.cookies.set('lab-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400, // 24h
    path: '/',
  });

  return res;
}
