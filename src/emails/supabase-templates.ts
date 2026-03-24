// src/emails/supabase-templates.ts
// ============================================================================
// Branded Supabase Auth Email Templates
// ============================================================================
// These are pasted MANUALLY into Supabase Dashboard → Authentication → Email Templates.
// They use Supabase Go template syntax: {{ .ConfirmationURL }}
// Admin preview: /admin/communications → Auth Templates tab
// ============================================================================

export type SupabaseTemplate = {
  id: string;
  name: string;
  subject: string;
  html: string;
};

// ── Shared layout ─────────────────────────────────────────────────────────────

function layout(opts: {
  heading: string;
  bodyText: string;
  buttonText: string;
  footerNote: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f7f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f5f0;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background-color:#0e393d;padding:32px 40px;text-align:center;border-radius:16px 16px 0 0;">
          <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:3px;text-transform:uppercase;">EVIDA LIFE</span>
        </td></tr>

        <!-- Gold accent bar -->
        <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#ceab84,transparent);"></td></tr>

        <!-- Body -->
        <tr><td style="background-color:#ffffff;padding:48px 40px;border-radius:0 0 16px 16px;">
          <h1 style="margin:0 0 16px;font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:700;color:#0e393d;line-height:1.25;">
            ${opts.heading}
          </h1>
          <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#1c2a2b;">
            ${opts.bodyText}
          </p>

          <!-- CTA Button -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
            <tr><td style="background-color:#ceab84;border-radius:12px;text-align:center;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">
                ${opts.buttonText}
              </a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:13px;line-height:1.5;color:rgba(28,42,43,0.5);">
            ${opts.footerNote}
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:rgba(28,42,43,0.4);line-height:1.6;">
            Evida Life AG &middot; Switzerland<br>
            <a href="https://evidalife.com" style="color:#ceab84;text-decoration:none;">evidalife.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Templates ─────────────────────────────────────────────────────────────────

export const SUPABASE_TEMPLATES: SupabaseTemplate[] = [
  {
    id: 'confirm_signup',
    name: 'Confirm Signup',
    subject: 'Welcome to Evida Life — Confirm Your Email',
    html: layout({
      heading: 'Welcome to Evida Life',
      bodyText: 'Thank you for joining. Please confirm your email address to activate your account and get started on your longevity journey.',
      buttonText: 'Confirm Email',
      footerNote: "If you didn't create an account with Evida Life, you can safely ignore this email.",
    }),
  },
  {
    id: 'reset_password',
    name: 'Reset Password',
    subject: 'Reset Your Password — Evida Life',
    html: layout({
      heading: 'Reset Your Password',
      bodyText: 'We received a request to reset the password for your Evida Life account. Click the button below to choose a new password.',
      buttonText: 'Reset Password',
      footerNote: "This link expires in 24 hours. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.",
    }),
  },
  {
    id: 'magic_link',
    name: 'Magic Link',
    subject: 'Your Login Link — Evida Life',
    html: layout({
      heading: 'Sign In to Evida Life',
      bodyText: 'Click the button below to sign in to your Evida Life account. No password needed.',
      buttonText: 'Sign In',
      footerNote: 'This link expires in 5 minutes and can only be used once. If you did not request this, you can safely ignore this email.',
    }),
  },
  {
    id: 'change_email_address',
    name: 'Change Email Address',
    subject: 'Confirm Your New Email — Evida Life',
    html: layout({
      heading: 'Confirm Email Change',
      bodyText: 'You requested to change the email address on your Evida Life account. Please confirm this change by clicking the button below.',
      buttonText: 'Confirm New Email',
      footerNote: "If you didn't request this change, please contact our support team immediately at support@evidalife.com.",
    }),
  },
  {
    id: 'invite_user',
    name: 'Invite User',
    subject: "You've Been Invited to Evida Life",
    html: layout({
      heading: "You're Invited",
      bodyText: "You've been invited to join Evida Life, the precision longevity health platform. Click below to set up your account and start tracking your health journey.",
      buttonText: 'Accept Invitation',
      footerNote: 'This invitation expires in 7 days. If you believe you received this email by mistake, you can safely ignore it.',
    }),
  },
];
