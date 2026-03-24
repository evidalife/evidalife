// src/emails/supabase-templates.ts
// ============================================================================
// Branded Supabase Auth Email Templates — multilingual (DE/EN/FR/ES/IT)
// ============================================================================
// Pasted MANUALLY into Supabase Dashboard → Authentication → Email Templates.
// Uses Supabase Go template syntax: {{ .ConfirmationURL }}
// Admin preview + copy: /admin/communications → Auth Emails tab
// ============================================================================

import { buildEmailShell } from '@/emails/templates';

export type Lang = 'en' | 'de' | 'fr' | 'es' | 'it';

export type AuthEmailContent = {
  subject: string;
  heading: string;
  body: string;
  buttonText: string;
  footerNote: string;
};

type AuthTemplateId =
  | 'confirm_signup'
  | 'reset_password'
  | 'magic_link'
  | 'change_email_address'
  | 'invite_user'
  | 'reauthentication';

// ── Translations ──────────────────────────────────────────────────────────────

const AUTH_T: Record<AuthTemplateId, Record<Lang, AuthEmailContent>> = {
  confirm_signup: {
    en: {
      subject: 'Welcome to Evida Life — Confirm Your Email',
      heading: 'Welcome to Evida Life',
      body: 'Thank you for creating an account. Please confirm your email address to activate your account and get started on your longevity journey.',
      buttonText: 'Confirm Email',
      footerNote: "If you didn't create an account with Evida Life, you can safely ignore this email.",
    },
    de: {
      subject: 'Willkommen bei Evida Life — E-Mail bestätigen',
      heading: 'Willkommen bei Evida Life',
      body: 'Danke für deine Registrierung. Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren und loszulegen.',
      buttonText: 'E-Mail bestätigen',
      footerNote: 'Falls du kein Konto erstellt hast, kannst du diese E-Mail ignorieren.',
    },
    fr: {
      subject: 'Bienvenue chez Evida Life — Confirmez votre e-mail',
      heading: 'Bienvenue chez Evida Life',
      body: "Merci de vous être inscrit. Veuillez confirmer votre adresse e-mail pour activer votre compte et commencer votre parcours longévité.",
      buttonText: "Confirmer l'e-mail",
      footerNote: "Si vous n'avez pas créé de compte, vous pouvez ignorer cet e-mail.",
    },
    es: {
      subject: 'Bienvenido a Evida Life — Confirma tu correo',
      heading: 'Bienvenido a Evida Life',
      body: 'Gracias por registrarte. Confirma tu dirección de correo electrónico para activar tu cuenta y comenzar tu camino hacia la longevidad.',
      buttonText: 'Confirmar correo',
      footerNote: 'Si no creaste una cuenta, puedes ignorar este correo.',
    },
    it: {
      subject: 'Benvenuto su Evida Life — Conferma la tua e-mail',
      heading: 'Benvenuto su Evida Life',
      body: 'Grazie per la registrazione. Conferma il tuo indirizzo e-mail per attivare il tuo account e iniziare il tuo percorso verso la longevità.',
      buttonText: 'Conferma e-mail',
      footerNote: "Se non hai creato un account, puoi ignorare questa e-mail.",
    },
  },

  reset_password: {
    en: {
      subject: 'Reset Your Password — Evida Life',
      heading: 'Reset Your Password',
      body: 'We received a request to reset the password for your Evida Life account. Click the button below to choose a new password.',
      buttonText: 'Reset Password',
      footerNote: "This link expires in 24 hours. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.",
    },
    de: {
      subject: 'Passwort zurücksetzen — Evida Life',
      heading: 'Passwort zurücksetzen',
      body: 'Wir haben eine Anfrage zum Zurücksetzen deines Passworts für dein Evida Life Konto erhalten. Klicke unten, um ein neues Passwort zu wählen.',
      buttonText: 'Passwort zurücksetzen',
      footerNote: 'Dieser Link läuft in 24 Stunden ab. Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren — dein Passwort bleibt unverändert.',
    },
    fr: {
      subject: 'Réinitialiser votre mot de passe — Evida Life',
      heading: 'Réinitialiser votre mot de passe',
      body: 'Nous avons reçu une demande de réinitialisation du mot de passe de votre compte Evida Life. Cliquez ci-dessous pour en choisir un nouveau.',
      buttonText: 'Réinitialiser le mot de passe',
      footerNote: "Ce lien expire dans 24 heures. Si vous n'avez pas demandé de réinitialisation, ignorez cet e-mail — votre mot de passe restera inchangé.",
    },
    es: {
      subject: 'Restablecer contraseña — Evida Life',
      heading: 'Restablecer contraseña',
      body: 'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de Evida Life. Haz clic abajo para elegir una nueva contraseña.',
      buttonText: 'Restablecer contraseña',
      footerNote: 'Este enlace caduca en 24 horas. Si no solicitaste esto, ignora este correo — tu contraseña permanecerá sin cambios.',
    },
    it: {
      subject: 'Reimposta la password — Evida Life',
      heading: 'Reimposta la password',
      body: 'Abbiamo ricevuto una richiesta di reimpostazione della password per il tuo account Evida Life. Clicca sotto per sceglierne una nuova.',
      buttonText: 'Reimposta la password',
      footerNote: 'Questo link scade tra 24 ore. Se non hai richiesto questo, ignora questa e-mail — la tua password rimarrà invariata.',
    },
  },

  magic_link: {
    en: {
      subject: 'Your Login Link — Evida Life',
      heading: 'Sign In to Evida Life',
      body: 'Click the button below to sign in to your account. No password needed — this is your secure one-click login link.',
      buttonText: 'Sign In',
      footerNote: 'This link expires in 5 minutes and can only be used once. If you did not request this, you can safely ignore this email.',
    },
    de: {
      subject: 'Dein Anmeldelink — Evida Life',
      heading: 'Bei Evida Life anmelden',
      body: 'Klicke unten, um dich bei deinem Konto anzumelden. Kein Passwort nötig — dies ist dein sicherer Einmal-Anmeldelink.',
      buttonText: 'Anmelden',
      footerNote: 'Dieser Link läuft in 5 Minuten ab und kann nur einmal verwendet werden. Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.',
    },
    fr: {
      subject: 'Votre lien de connexion — Evida Life',
      heading: 'Connectez-vous à Evida Life',
      body: 'Cliquez ci-dessous pour vous connecter à votre compte. Aucun mot de passe nécessaire — voici votre lien de connexion sécurisé.',
      buttonText: 'Se connecter',
      footerNote: "Ce lien expire dans 5 minutes et ne peut être utilisé qu'une seule fois. Si vous n'avez pas demandé cela, ignorez cet e-mail.",
    },
    es: {
      subject: 'Tu enlace de inicio de sesión — Evida Life',
      heading: 'Inicia sesión en Evida Life',
      body: 'Haz clic abajo para iniciar sesión en tu cuenta. Sin contraseña — este es tu enlace de acceso seguro de un clic.',
      buttonText: 'Iniciar sesión',
      footerNote: 'Este enlace caduca en 5 minutos y solo se puede usar una vez. Si no lo solicitaste, ignora este correo.',
    },
    it: {
      subject: 'Il tuo link di accesso — Evida Life',
      heading: 'Accedi a Evida Life',
      body: 'Clicca sotto per accedere al tuo account. Nessuna password necessaria — questo è il tuo link di accesso sicuro.',
      buttonText: 'Accedi',
      footerNote: 'Questo link scade tra 5 minuti e può essere usato solo una volta. Se non hai richiesto questo, ignora questa e-mail.',
    },
  },

  change_email_address: {
    en: {
      subject: 'Confirm Your New Email — Evida Life',
      heading: 'Confirm Email Change',
      body: 'You requested to change the email address on your Evida Life account. Please confirm this change by clicking the button below.',
      buttonText: 'Confirm New Email',
      footerNote: "If you didn't request this change, please contact support@evidalife.com immediately.",
    },
    de: {
      subject: 'Neue E-Mail-Adresse bestätigen — Evida Life',
      heading: 'E-Mail-Änderung bestätigen',
      body: 'Du hast eine Änderung deiner E-Mail-Adresse für dein Evida Life Konto angefordert. Bitte bestätige diese Änderung.',
      buttonText: 'Neue E-Mail bestätigen',
      footerNote: 'Falls du diese Änderung nicht angefordert hast, kontaktiere bitte sofort support@evidalife.com.',
    },
    fr: {
      subject: 'Confirmez votre nouvel e-mail — Evida Life',
      heading: "Confirmer le changement d'e-mail",
      body: "Vous avez demandé à changer l'adresse e-mail de votre compte Evida Life. Veuillez confirmer ce changement en cliquant ci-dessous.",
      buttonText: 'Confirmer le nouvel e-mail',
      footerNote: "Si vous n'avez pas demandé ce changement, contactez immédiatement support@evidalife.com.",
    },
    es: {
      subject: 'Confirma tu nuevo correo — Evida Life',
      heading: 'Confirmar cambio de correo',
      body: 'Has solicitado cambiar la dirección de correo de tu cuenta de Evida Life. Confirma este cambio haciendo clic abajo.',
      buttonText: 'Confirmar nuevo correo',
      footerNote: 'Si no solicitaste este cambio, contacta inmediatamente a support@evidalife.com.',
    },
    it: {
      subject: 'Conferma la tua nuova e-mail — Evida Life',
      heading: 'Conferma cambio e-mail',
      body: "Hai richiesto di cambiare l'indirizzo e-mail del tuo account Evida Life. Conferma questa modifica cliccando qui sotto.",
      buttonText: 'Conferma nuova e-mail',
      footerNote: 'Se non hai richiesto questa modifica, contatta subito support@evidalife.com.',
    },
  },

  invite_user: {
    en: {
      subject: "You've Been Invited to Evida Life",
      heading: "You're Invited",
      body: "You've been invited to join Evida Life, the precision longevity health platform. Click below to set up your account and start your health journey.",
      buttonText: 'Accept Invitation',
      footerNote: 'This invitation expires in 7 days. If you received this by mistake, you can safely ignore it.',
    },
    de: {
      subject: 'Du wurdest zu Evida Life eingeladen',
      heading: 'Du bist eingeladen',
      body: 'Du wurdest eingeladen, Evida Life — die Präzisions-Langlebigkeitsplattform — beizutreten. Klicke unten, um dein Konto einzurichten und deine Gesundheitsreise zu beginnen.',
      buttonText: 'Einladung annehmen',
      footerNote: 'Diese Einladung läuft in 7 Tagen ab. Falls du sie irrtümlich erhalten hast, ignoriere diese E-Mail.',
    },
    fr: {
      subject: 'Vous avez été invité à rejoindre Evida Life',
      heading: 'Vous êtes invité',
      body: 'Vous avez été invité à rejoindre Evida Life, la plateforme de santé longévité de précision. Cliquez ci-dessous pour créer votre compte.',
      buttonText: "Accepter l'invitation",
      footerNote: "Cette invitation expire dans 7 jours. Si vous l'avez reçue par erreur, ignorez cet e-mail.",
    },
    es: {
      subject: 'Has sido invitado a Evida Life',
      heading: 'Has sido invitado',
      body: 'Has sido invitado a unirte a Evida Life, la plataforma de salud y longevidad de precisión. Haz clic abajo para configurar tu cuenta.',
      buttonText: 'Aceptar invitación',
      footerNote: 'Esta invitación caduca en 7 días. Si la recibiste por error, ignora este correo.',
    },
    it: {
      subject: 'Sei stato invitato a Evida Life',
      heading: 'Sei stato invitato',
      body: 'Sei stato invitato a unirti a Evida Life, la piattaforma di salute per la longevità di precisione. Clicca sotto per configurare il tuo account.',
      buttonText: 'Accetta invito',
      footerNote: "Questo invito scade tra 7 giorni. Se l'hai ricevuto per errore, ignoralo.",
    },
  },

  reauthentication: {
    en: {
      subject: 'Confirm Your Identity — Evida Life',
      heading: 'Confirm Your Identity',
      body: "For your security, please confirm your identity before continuing. Click the button below to verify it's you.",
      buttonText: 'Confirm Identity',
      footerNote: "This link expires in 10 minutes. If you didn't initiate this action, please change your password immediately.",
    },
    de: {
      subject: 'Identität bestätigen — Evida Life',
      heading: 'Identität bestätigen',
      body: 'Zu deiner Sicherheit bestätige bitte deine Identität, bevor du fortfährst. Klicke auf den Button, um dich zu verifizieren.',
      buttonText: 'Identität bestätigen',
      footerNote: 'Dieser Link ist 10 Minuten gültig. Wenn du diese Aktion nicht ausgelöst hast, ändere bitte sofort dein Passwort.',
    },
    es: {
      subject: 'Confirma tu identidad — Evida Life',
      heading: 'Confirma tu identidad',
      body: 'Por tu seguridad, confirma tu identidad antes de continuar. Haz clic en el botón para verificar que eres tú.',
      buttonText: 'Confirmar identidad',
      footerNote: 'Este enlace caduca en 10 minutos.',
    },
    fr: {
      subject: 'Confirmez votre identité — Evida Life',
      heading: 'Confirmez votre identité',
      body: 'Pour votre sécurité, veuillez confirmer votre identité avant de continuer. Cliquez sur le bouton ci-dessous.',
      buttonText: "Confirmer l'identité",
      footerNote: 'Ce lien expire dans 10 minutes.',
    },
    it: {
      subject: 'Conferma la tua identità — Evida Life',
      heading: 'Conferma la tua identità',
      body: 'Per la tua sicurezza, conferma la tua identità prima di continuare. Clicca il pulsante qui sotto per verificare.',
      buttonText: 'Conferma identità',
      footerNote: 'Questo link scade tra 10 minuti.',
    },
  },
};

// ── Builder helpers ───────────────────────────────────────────────────────────

const PREVIEW_URL = 'https://evidalife.com/auth/confirm?token=preview-token&type=preview';

function buildAuthHtml(content: AuthEmailContent, preview: boolean): string {
  return buildEmailShell({
    heading: content.heading,
    bodyHtml: `<p style="margin:0 0 8px;font-size:16px;line-height:1.7;color:#1c2a2b;">${content.body}</p>`,
    ctaUrl: preview ? PREVIEW_URL : '{{ .ConfirmationURL }}',
    ctaText: content.buttonText,
    footerNote: content.footerNote,
  });
}

// ── Exported builder functions ────────────────────────────────────────────────

export function buildConfirmSignupEmail(lang: Lang, overrides?: Partial<AuthEmailContent>, preview?: boolean): { subject: string; html: string } {
  const content = { ...AUTH_T.confirm_signup[lang] ?? AUTH_T.confirm_signup.en, ...overrides };
  return { subject: content.subject, html: buildAuthHtml(content, !!preview) };
}

export function buildResetPasswordEmail(lang: Lang, overrides?: Partial<AuthEmailContent>, preview?: boolean): { subject: string; html: string } {
  const content = { ...AUTH_T.reset_password[lang] ?? AUTH_T.reset_password.en, ...overrides };
  return { subject: content.subject, html: buildAuthHtml(content, !!preview) };
}

export function buildMagicLinkEmail(lang: Lang, overrides?: Partial<AuthEmailContent>, preview?: boolean): { subject: string; html: string } {
  const content = { ...AUTH_T.magic_link[lang] ?? AUTH_T.magic_link.en, ...overrides };
  return { subject: content.subject, html: buildAuthHtml(content, !!preview) };
}

export function buildChangeEmailEmail(lang: Lang, overrides?: Partial<AuthEmailContent>, preview?: boolean): { subject: string; html: string } {
  const content = { ...AUTH_T.change_email_address[lang] ?? AUTH_T.change_email_address.en, ...overrides };
  return { subject: content.subject, html: buildAuthHtml(content, !!preview) };
}

export function buildInviteUserEmail(lang: Lang, overrides?: Partial<AuthEmailContent>, preview?: boolean): { subject: string; html: string } {
  const content = { ...AUTH_T.invite_user[lang] ?? AUTH_T.invite_user.en, ...overrides };
  return { subject: content.subject, html: buildAuthHtml(content, !!preview) };
}

export function buildReauthenticationEmail(lang: Lang, overrides?: Partial<AuthEmailContent>, preview?: boolean): { subject: string; html: string } {
  const content = { ...AUTH_T.reauthentication[lang] ?? AUTH_T.reauthentication.en, ...overrides };
  return { subject: content.subject, html: buildAuthHtml(content, !!preview) };
}

// ── Helpers used by admin UI ──────────────────────────────────────────────────

export function getAuthTemplateDefaults(id: string, lang: Lang): AuthEmailContent {
  const tpl = AUTH_T[id as AuthTemplateId];
  return tpl?.[lang] ?? tpl?.en ?? { subject: '', heading: '', body: '', buttonText: '', footerNote: '' };
}

export function buildAuthPreview(id: string, lang: Lang, overrides?: Partial<AuthEmailContent>): { subject: string; html: string } {
  switch (id) {
    case 'reset_password':       return buildResetPasswordEmail(lang, overrides, true);
    case 'magic_link':           return buildMagicLinkEmail(lang, overrides, true);
    case 'change_email_address': return buildChangeEmailEmail(lang, overrides, true);
    case 'invite_user':          return buildInviteUserEmail(lang, overrides, true);
    case 'reauthentication':     return buildReauthenticationEmail(lang, overrides, true);
    default:                     return buildConfirmSignupEmail(lang, overrides, true);
  }
}

export const AUTH_TEMPLATE_LIST: { id: string; name: string }[] = [
  { id: 'confirm_signup',       name: 'Confirm Signup' },
  { id: 'reset_password',       name: 'Reset Password' },
  { id: 'magic_link',           name: 'Magic Link' },
  { id: 'change_email_address', name: 'Change Email' },
  { id: 'invite_user',          name: 'Invite User' },
  { id: 'reauthentication',     name: 'Reauthentication' },
];
