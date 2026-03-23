import { Resend } from 'resend';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email to', to);
    return;
  }
  const { error } = await getResend().emails.send({
    from: 'Evida Life <noreply@evidalife.com>',
    to,
    subject,
    html,
  });
  if (error) {
    console.error('[email] Failed to send:', error);
    throw error;
  }
}
