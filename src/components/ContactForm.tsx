'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Lang = 'de' | 'en';

const T = {
  de: {
    name:        'Name',
    namePh:      'Dein Name',
    email:       'E-Mail',
    emailPh:     'deine@email.com',
    message:     'Nachricht',
    messagePh:   'Wie können wir dir helfen?',
    send:        'Nachricht senden',
    sending:     'Wird gesendet…',
    successHead: 'Nachricht erhalten!',
    successBody: 'Wir melden uns so schnell wie möglich bei dir.',
    errorHead:   'Fehler beim Senden',
    errorBody:   'Bitte versuche es erneut oder schreib uns direkt an hello@evidalife.com.',
    required:    'Bitte fülle alle Felder aus.',
    another:     'Weitere Nachricht senden',
  },
  en: {
    name:        'Name',
    namePh:      'Your name',
    email:       'Email',
    emailPh:     'you@email.com',
    message:     'Message',
    messagePh:   'How can we help you?',
    send:        'Send message',
    sending:     'Sending…',
    successHead: 'Message received!',
    successBody: "We'll get back to you as soon as possible.",
    errorHead:   'Something went wrong',
    errorBody:   'Please try again or email us at hello@evidalife.com.',
    required:    'Please fill in all fields.',
    another:     'Send another message',
  },
};

const inputCls = 'w-full rounded-xl border border-[#0e393d]/15 bg-white px-4 py-2.5 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/35 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition';

export default function ContactForm({ lang }: { lang: Lang }) {
  const t = T[lang];
  const supabase = createClient();

  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [message, setMessage] = useState('');
  const [state,   setState]   = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!name.trim() || !email.trim() || !message.trim()) {
      setValidationError(t.required);
      return;
    }

    setState('sending');

    const { error } = await supabase.from('contact_messages').insert({
      name:    name.trim(),
      email:   email.trim(),
      message: message.trim(),
    });

    setState(error ? 'error' : 'success');
  };

  if (state === 'success') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-8 py-10 text-center">
        <div className="mb-3 text-3xl">✓</div>
        <p className="font-serif text-xl text-emerald-800 mb-2">{t.successHead}</p>
        <p className="text-sm text-emerald-700/70">{t.successBody}</p>
        <button
          type="button"
          onClick={() => { setState('idle'); setName(''); setEmail(''); setMessage(''); }}
          className="mt-6 text-xs font-medium text-emerald-700 hover:underline"
        >
          {t.another}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[#0e393d]/70 mb-1.5">{t.name}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.namePh}
          className={inputCls}
          disabled={state === 'sending'}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#0e393d]/70 mb-1.5">{t.email}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.emailPh}
          className={inputCls}
          disabled={state === 'sending'}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#0e393d]/70 mb-1.5">{t.message}</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.messagePh}
          rows={5}
          className={`${inputCls} resize-none`}
          disabled={state === 'sending'}
        />
      </div>

      {validationError && (
        <p className="text-xs text-red-600">{validationError}</p>
      )}

      {state === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-700">{t.errorHead}</p>
          <p className="text-xs text-red-600/80 mt-0.5">{t.errorBody}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={state === 'sending'}
        className="w-full rounded-xl bg-[#0e393d] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0e393d]/85 transition disabled:opacity-60"
      >
        {state === 'sending' ? t.sending : t.send}
      </button>
    </form>
  );
}
