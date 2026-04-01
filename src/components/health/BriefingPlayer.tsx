'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

type Lang = 'en' | 'de' | 'fr' | 'es' | 'it';

interface BriefingStep {
  id: string;
  title: string;
  narration: string;
  highlight: string;
}

type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'waiting' | 'done' | 'error';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  lang: Lang;
  firstName: string;
  onHighlight?: (section: string | null) => void;
}

const T: Record<Lang, Record<string, string>> = {
  en: {
    title: 'Your Health Briefing',
    sub: 'Personalized audio summary of your latest results',
    listen: 'Listen now',
    generating: 'Preparing your briefing…',
    step: 'Step',
    of: 'of',
    pause: 'Pause',
    resume: 'Resume',
    next: 'Next',
    skip: 'Skip',
    askAnything: 'Ask anything about your results…',
    send: 'Send',
    continue: 'Continue briefing',
    done: 'Briefing complete',
    doneMsg: 'That\'s your health overview. Any questions? Ask below.',
    error: 'Could not generate briefing. Please try again.',
    retry: 'Try again',
    questions: 'Questions?',
    questionsSub: 'Ask about any result or continue to the next step.',
    thinking: 'Thinking…',
    useVoice: 'Use microphone',
    stopVoice: 'Stop listening',
  },
  de: {
    title: 'Dein Gesundheitsbriefing',
    sub: 'Personalisierte Audio-Zusammenfassung deiner Ergebnisse',
    listen: 'Jetzt anhören',
    generating: 'Briefing wird vorbereitet…',
    step: 'Schritt',
    of: 'von',
    pause: 'Pause',
    resume: 'Fortsetzen',
    next: 'Weiter',
    skip: 'Überspringen',
    askAnything: 'Frage alles zu deinen Ergebnissen…',
    send: 'Senden',
    continue: 'Briefing fortsetzen',
    done: 'Briefing abgeschlossen',
    doneMsg: 'Das ist deine Gesundheitsübersicht. Fragen? Schreib unten.',
    error: 'Briefing konnte nicht erstellt werden. Bitte erneut versuchen.',
    retry: 'Erneut versuchen',
    questions: 'Fragen?',
    questionsSub: 'Frage zu einem Ergebnis oder fahre fort.',
    thinking: 'Denke nach…',
    useVoice: 'Mikrofon verwenden',
    stopVoice: 'Aufnahme stoppen',
  },
  fr: {
    title: 'Votre Briefing Santé',
    sub: 'Résumé audio personnalisé de vos derniers résultats',
    listen: 'Écouter',
    generating: 'Préparation du briefing…',
    step: 'Étape',
    of: 'sur',
    pause: 'Pause',
    resume: 'Reprendre',
    next: 'Suivant',
    skip: 'Passer',
    askAnything: 'Posez une question sur vos résultats…',
    send: 'Envoyer',
    continue: 'Continuer le briefing',
    done: 'Briefing terminé',
    doneMsg: 'Voici votre aperçu santé. Des questions ? Écrivez ci-dessous.',
    error: 'Impossible de générer le briefing. Veuillez réessayer.',
    retry: 'Réessayer',
    questions: 'Questions?',
    questionsSub: 'Posez une question ou passez à l\'étape suivante.',
    thinking: 'Réflexion…',
    useVoice: 'Utiliser le microphone',
    stopVoice: 'Arrêter l\'écoute',
  },
  es: {
    title: 'Tu Informe de Salud',
    sub: 'Resumen de audio personalizado de tus últimos resultados',
    listen: 'Escuchar',
    generating: 'Preparando tu informe…',
    step: 'Paso',
    of: 'de',
    pause: 'Pausa',
    resume: 'Reanudar',
    next: 'Siguiente',
    skip: 'Saltar',
    askAnything: 'Pregunta sobre tus resultados…',
    send: 'Enviar',
    continue: 'Continuar informe',
    done: 'Informe completo',
    doneMsg: 'Este es tu resumen de salud. ¿Preguntas? Escribe abajo.',
    error: 'No se pudo generar el informe. Inténtalo de nuevo.',
    retry: 'Reintentar',
    questions: '¿Preguntas?',
    questionsSub: 'Pregunta sobre algún resultado o continúa.',
    thinking: 'Pensando…',
    useVoice: 'Usar micrófono',
    stopVoice: 'Dejar de escuchar',
  },
  it: {
    title: 'Il Tuo Briefing Salute',
    sub: 'Riepilogo audio personalizzato dei tuoi ultimi risultati',
    listen: 'Ascolta ora',
    generating: 'Preparazione briefing…',
    step: 'Passo',
    of: 'di',
    pause: 'Pausa',
    resume: 'Riprendi',
    next: 'Avanti',
    skip: 'Salta',
    askAnything: 'Chiedi qualcosa sui tuoi risultati…',
    send: 'Invia',
    continue: 'Continua briefing',
    done: 'Briefing completato',
    doneMsg: 'Questo è il tuo riepilogo salute. Domande? Scrivi qui sotto.',
    error: 'Impossibile generare il briefing. Riprova.',
    retry: 'Riprova',
    questions: 'Domande?',
    questionsSub: 'Fai una domanda o continua al passo successivo.',
    thinking: 'Pensando…',
    useVoice: 'Usa il microfono',
    stopVoice: 'Smetti di ascoltare',
  },
};

// Waveform heights precomputed to avoid hydration issues
const WAVEFORM = [10,14,13,12,15,14,13,11,8,6,4,2,3,4,6,8,9,14,11,17,14,14,14,9,5,7,5,4,3,3,5,3,8,14,13,15,12,17,15,13,9,5,3,2,2,4,9,7];

export default function BriefingPlayer({ lang, firstName, onHighlight }: Props) {
  const t = T[lang];
  const [state, setState] = useState<PlayerState>('idle');
  const [steps, setSteps] = useState<BriefingStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [bioContext, setBioContext] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [ttsMode, setTtsMode] = useState<'elevenlabs' | 'browser' | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const usingBrowserTTSRef = useRef(false); // true when current step plays via SpeechSynthesis
  const audioBlobUrls = useRef<Record<number, string>>({});
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatMessages, streamingText]);

  // Track whether TTS provider is available (not just unconfigured)
  const ttsAvailable = useRef<boolean | null>(null); // null = unknown, true = works, false = not configured

  // Fetch TTS audio for a step
  const fetchAudio = useCallback(async (stepIndex: number, narration: string): Promise<string | null> => {
    // If already fetched, return cached URL
    if (audioBlobUrls.current[stepIndex]) return audioBlobUrls.current[stepIndex];
    // If we already know TTS is not configured, skip API call
    if (ttsAvailable.current === false) return null;

    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: narration, lang }),
      });

      if (!res.ok) {
        if (res.status === 501) {
          // Not configured — skip further attempts
          ttsAvailable.current = false;
          setTtsMode('browser');
          return null;
        }
        // 402 = payment required, 429 = quota exceeded, 500/502 = API error
        let hint = '';
        if (res.status === 402) hint = 'ElevenLabs account needs credits or an active plan';
        else if (res.status === 429) hint = 'ElevenLabs quota exceeded';
        else hint = `ElevenLabs error ${res.status}`;
        console.warn('[BriefingPlayer] TTS failed:', hint);
        ttsAvailable.current = false; // don't retry for this session
        setTtsMode('browser');
        setTtsError(hint);
        return null;
      }

      ttsAvailable.current = true;
      setTtsMode('elevenlabs');
      setTtsError(null);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      audioBlobUrls.current[stepIndex] = url;
      return url;
    } catch {
      return null;
    }
  }, [lang]);

  // Play a step's narration (audio or SpeechSynthesis fallback)
  const playStep = useCallback(async (stepIndex: number) => {
    const step = steps[stepIndex];
    if (!step) return;

    onHighlight?.(step.highlight);
    setState('playing');

    const audioUrl = await fetchAudio(stepIndex, step.narration);

    if (audioUrl) {
      // HTML Audio playback
      usingBrowserTTSRef.current = false;
      window.speechSynthesis?.cancel(); // stop any leftover speech
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.addEventListener('timeupdate', () => {
        setAudioProgress(audio.currentTime);
        setAudioDuration(audio.duration || 0);
      });

      audio.addEventListener('ended', () => {
        setAudioProgress(0);
        setAudioDuration(0);
        setState('waiting');
        onHighlight?.(null);
        // Pre-fetch next step audio in background
        if (steps[stepIndex + 1]) {
          fetchAudio(stepIndex + 1, steps[stepIndex + 1].narration);
        }
      });

      audio.play().catch(() => {
        // Autoplay blocked — show play button
        setState('paused');
      });
    } else {
      // SpeechSynthesis fallback
      usingBrowserTTSRef.current = true;
      audioRef.current = null; // clear stale audio ref so togglePause uses the right path
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(step.narration);
        utterance.lang = lang === 'de' ? 'de-DE' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : lang === 'it' ? 'it-IT' : 'en-US';
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.onend = () => {
          // Only transition to waiting if we're still playing (not already paused/stopped)
          usingBrowserTTSRef.current = false;
          setState(prev => prev === 'playing' ? 'waiting' : prev);
          onHighlight?.(null);
        };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } else {
        // No audio available — just show text
        usingBrowserTTSRef.current = false;
        setState('waiting');
        onHighlight?.(null);
      }
    }
  }, [steps, lang, fetchAudio, onHighlight]);

  // Track whether we should auto-play after steps load
  const shouldAutoPlay = useRef(false);
  const stepsRef = useRef<BriefingStep[]>([]);
  stepsRef.current = steps;

  // When steps are set and auto-play is flagged, start playing step 0
  useEffect(() => {
    if (shouldAutoPlay.current && steps.length > 0 && state === 'loading') {
      shouldAutoPlay.current = false;
      playStep(0);
    }
  }, [steps, state, playStep]);

  // Generate briefing
  const generateBriefing = useCallback(async () => {
    setState('loading');
    setErrorMsg('');
    setChatMessages([]);
    setCurrentStep(0);
    // Clear cached audio blobs so a fresh briefing gets fresh TTS
    Object.values(audioBlobUrls.current).forEach(url => URL.revokeObjectURL(url));
    audioBlobUrls.current = {};

    try {
      const res = await fetch('/api/ai/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate briefing');
      }

      const data = await res.json();
      shouldAutoPlay.current = true;
      setSteps(data.steps);
      setBioContext(data.summary ?? '');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setErrorMsg(msg);
      setState('error');
    }
  }, [lang]);

  const goToNextStep = useCallback(() => {
    const next = currentStep + 1;
    if (next >= steps.length) {
      setState('done');
      onHighlight?.(null);
      return;
    }
    setChatMessages([]);
    setCurrentStep(next);
    playStep(next);
  }, [currentStep, steps, playStep, onHighlight]);

  const togglePause = useCallback(() => {
    if (!usingBrowserTTSRef.current && audioRef.current) {
      // HTML Audio — reliable pause/resume
      if (state === 'playing') {
        audioRef.current.pause();
        setState('paused');
      } else if (state === 'paused') {
        audioRef.current.play().catch(() => {});
        setState('playing');
      }
    } else {
      // Browser SpeechSynthesis — pause() is unreliable in Chrome.
      // Cancel and restart the step (goes to waiting, user can replay via Continue).
      if (state === 'playing') {
        window.speechSynthesis?.cancel();
        usingBrowserTTSRef.current = false;
        setState('waiting');
      } else if (state === 'paused') {
        // Re-play the current step from the beginning
        playStep(currentStep);
      }
    }
  }, [state, currentStep, playStep]);

  // Streaming chat
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsStreaming(true);
    setStreamingText('');

    const allMessages = [...chatMessages, userMsg];

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages,
          context: bioContext,
          lang,
          mode: 'briefing',
        }),
      });

      if (!res.ok || !res.body) throw new Error('Chat failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              accumulated += parsed.text;
              setStreamingText(accumulated);
            }
          } catch {
            // skip malformed chunk
          }
        }
      }

      setChatMessages(prev => [...prev, { role: 'assistant', content: accumulated }]);
      setStreamingText('');
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '…' }]);
    } finally {
      setIsStreaming(false);
    }
  }, [chatMessages, bioContext, lang, isStreaming]);

  // Voice input
  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'de' ? 'de-DE' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : lang === 'it' ? 'it-IT' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setChatInput(transcript);
      setIsListening(false);
      sendMessage(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, lang, sendMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
      Object.values(audioBlobUrls.current).forEach(url => URL.revokeObjectURL(url));
      recognitionRef.current?.stop();
    };
  }, []);

  const progressPercent = audioDuration > 0 ? (audioProgress / audioDuration) * 100 : 0;
  const currentStepData = steps[currentStep];

  // ── IDLE STATE ──────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <div className="bg-gradient-to-r from-[#0e393d] to-[#13474c] rounded-2xl overflow-hidden shadow-lg">
        <div className="p-6 flex items-center gap-5">
          <button
            onClick={generateBriefing}
            className="w-14 h-14 rounded-full bg-[#0C9C6C] hover:bg-[#0ab07a] active:scale-95 transition-all flex items-center justify-center shrink-0 shadow-lg shadow-[#0C9C6C]/20"
          >
            <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
              <path d="M1 1.5v17l16-8.5L1 1.5z" fill="white" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-[13px] font-semibold text-white">{t.title}</h3>
              <span className="text-[9px] font-semibold tracking-[.08em] uppercase px-2 py-0.5 rounded-full bg-[#0C9C6C]/20 text-[#0C9C6C]">AI</span>
            </div>
            <p className="text-[11px] text-white/40 mb-3">{t.sub}</p>
            <div className="flex items-center gap-[2px] h-5">
              {WAVEFORM.map((h, i) => (
                <div key={i} className="w-[3px] rounded-full bg-white/10" style={{ height: h }} />
              ))}
            </div>
          </div>
          <button
            onClick={generateBriefing}
            className="shrink-0 px-4 py-2 rounded-xl bg-white/[.08] hover:bg-white/[.12] border border-white/[.08] text-[11px] font-semibold text-white/60 hover:text-white/80 transition-all"
          >
            {t.listen}
          </button>
        </div>
      </div>
    );
  }

  // ── LOADING STATE ───────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="bg-gradient-to-r from-[#0e393d] to-[#13474c] rounded-2xl overflow-hidden shadow-lg">
        <div className="p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-[#0C9C6C]/20 flex items-center justify-center shrink-0">
            <svg className="animate-spin w-6 h-6 text-[#0C9C6C]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-white mb-1">{t.title}</div>
            <div className="text-[11px] text-white/40 flex items-center gap-1.5">
              <span>{t.generating}</span>
              <span className="inline-flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1 h-1 rounded-full bg-[#0C9C6C] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── ERROR STATE ─────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="bg-gradient-to-r from-[#0e393d] to-[#13474c] rounded-2xl overflow-hidden shadow-lg">
        <div className="p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E24B4A" strokeWidth="1.5">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-white mb-1">{t.error}</div>
            {errorMsg && <div className="text-[10px] text-white/30 mb-2">{errorMsg}</div>}
            <button
              onClick={generateBriefing}
              className="text-[11px] font-semibold text-[#0C9C6C] hover:text-[#0ab07a] transition-colors"
            >
              {t.retry}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING / PAUSED / WAITING / DONE STATES ────────────────────
  return (
    <div className="bg-gradient-to-r from-[#0e393d] to-[#13474c] rounded-2xl overflow-hidden shadow-lg">
      {/* Player header */}
      <div className="p-5 flex items-start gap-4">
        {/* Play/Pause button */}
        <button
          onClick={state === 'waiting' || state === 'done' ? undefined : togglePause}
          disabled={state === 'waiting' || state === 'done'}
          className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all ${
            state === 'playing' ? 'bg-[#0C9C6C] hover:bg-[#0ab07a] shadow-lg shadow-[#0C9C6C]/20' :
            state === 'paused' ? 'bg-[#ceab84] hover:bg-[#d4b890]' :
            'bg-white/[.08]'
          }`}
        >
          {state === 'playing' ? (
            <svg width="14" height="16" viewBox="0 0 14 16" fill="white">
              <rect x="0" y="0" width="4" height="16" rx="1" />
              <rect x="10" y="0" width="4" height="16" rx="1" />
            </svg>
          ) : state === 'paused' ? (
            <svg width="14" height="16" viewBox="0 0 14 16" fill="white">
              <path d="M1 1.5v13l12-6.5L1 1.5z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" opacity="0.4">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          )}
        </button>

        {/* Step info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-[13px] font-semibold text-white">
              {state === 'done' ? t.done : currentStepData?.title ?? t.title}
            </h3>
            {steps.length > 0 && state !== 'done' && (
              <span className="text-[9px] text-white/30">
                {t.step} {currentStep + 1} {t.of} {steps.length}
              </span>
            )}
            {/* TTS mode badge */}
            {ttsMode === 'browser' && (
              <span
                className="text-[8px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 cursor-help"
                title={ttsError ?? 'Using browser text-to-speech (ElevenLabs unavailable)'}
              >
                Browser TTS{ttsError ? ' ⚠' : ''}
              </span>
            )}
            {ttsMode === 'elevenlabs' && (
              <span className="text-[8px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#0C9C6C]/20 text-[#0C9C6C]">
                ElevenLabs
              </span>
            )}
          </div>

          {/* Progress bar */}
          {(state === 'playing' || state === 'paused') && (
            <div className="w-full bg-white/[.08] rounded-full h-[3px] mb-2.5 overflow-hidden">
              <div
                className="bg-[#0C9C6C] h-full rounded-full transition-all duration-300"
                style={{ width: `${audioDuration > 0 ? progressPercent : 50}%` }}
              />
            </div>
          )}

          {/* Waveform — animated when playing */}
          {(state === 'playing' || state === 'paused') && (
            <div className="flex items-center gap-[2px] h-5">
              {WAVEFORM.map((h, i) => (
                <div
                  key={i}
                  className={`w-[3px] rounded-full transition-all ${state === 'playing' ? 'bg-[#0C9C6C]/60' : 'bg-white/15'}`}
                  style={{
                    height: state === 'playing' ? Math.max(2, h * (0.6 + Math.sin(i * 0.7) * 0.4)) : h,
                    animation: state === 'playing' ? `pulse ${0.4 + (i % 5) * 0.1}s ease-in-out infinite alternate` : 'none',
                  }}
                />
              ))}
            </div>
          )}

          {/* Narration text (shown when waiting) */}
          {state === 'waiting' && currentStepData && (
            <p className="text-[11px] text-white/50 leading-relaxed mt-1">{currentStepData.narration}</p>
          )}

          {/* Done message */}
          {state === 'done' && (
            <p className="text-[11px] text-white/40 mt-1">{t.doneMsg}</p>
          )}
        </div>

        {/* Next/Skip buttons */}
        {state === 'waiting' && currentStep < steps.length - 1 && (
          <button
            onClick={goToNextStep}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#0C9C6C]/20 hover:bg-[#0C9C6C]/30 text-[11px] font-semibold text-[#0C9C6C] transition-colors"
          >
            {t.continue} →
          </button>
        )}
        {(state === 'playing' || state === 'paused') && currentStep < steps.length - 1 && (
          <button
            onClick={goToNextStep}
            className="shrink-0 text-[10px] text-white/20 hover:text-white/40 transition-colors"
          >
            {t.skip}
          </button>
        )}
      </div>

      {/* Step progress dots */}
      {steps.length > 1 && (
        <div className="px-5 pb-3 flex items-center gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-[3px] rounded-full transition-all ${
                i < currentStep ? 'bg-[#0C9C6C]/60' :
                i === currentStep ? 'bg-[#0C9C6C] w-6' :
                'bg-white/10'
              } ${i !== currentStep ? 'w-3' : ''}`}
            />
          ))}
        </div>
      )}

      {/* Chat section — shown when waiting between steps or done */}
      {(state === 'waiting' || state === 'done') && (
        <div className="border-t border-white/[.06]">
          {/* Q&A header */}
          <div className="px-5 py-3">
            <div className="text-[10px] font-semibold tracking-[.08em] uppercase text-white/25">{t.questions}</div>
            <div className="text-[10px] text-white/20">{t.questionsSub}</div>
          </div>

          {/* Chat messages */}
          {chatMessages.length > 0 && (
            <div ref={chatScrollRef} className="px-5 pb-3 space-y-2.5 max-h-48 overflow-y-auto">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[11px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#0C9C6C]/20 text-white/80'
                      : 'bg-white/[.06] text-white/60'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {streamingText && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] px-3 py-2 rounded-xl text-[11px] leading-relaxed bg-white/[.06] text-white/60">
                    {streamingText}
                    <span className="inline-block w-1 h-3 bg-white/30 ml-0.5 animate-pulse" />
                  </div>
                </div>
              )}
              {isStreaming && !streamingText && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-xl bg-white/[.06]">
                    <span className="inline-flex gap-1">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1 h-1 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chat input */}
          <div className="px-5 pb-5">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(chatInput); } }}
                placeholder={t.askAnything}
                disabled={isStreaming}
                className="flex-1 rounded-xl bg-white/[.06] border border-white/[.08] px-4 py-2.5 text-[12px] text-white/70 placeholder:text-white/20 outline-none focus:border-[#0C9C6C]/40 focus:bg-white/[.08] transition-all disabled:opacity-50"
              />
              {/* Voice button */}
              {typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) ? (
                <button
                  onClick={toggleVoice}
                  disabled={isStreaming}
                  className={`rounded-xl border px-3 py-2.5 transition-all ${
                    isListening
                      ? 'bg-red-500/20 border-red-500/30 text-red-400 animate-pulse'
                      : 'bg-white/[.06] border-white/[.08] text-white/30 hover:text-white/50 hover:bg-white/[.09]'
                  }`}
                  title={isListening ? t.stopVoice : t.useVoice}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </button>
              ) : null}
              {/* Send button */}
              <button
                onClick={() => sendMessage(chatInput)}
                disabled={isStreaming || !chatInput.trim()}
                className="rounded-xl bg-[#0C9C6C]/80 hover:bg-[#0C9C6C] disabled:opacity-30 disabled:cursor-not-allowed px-3.5 py-2.5 transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
