'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Lang, BriefingSlide, BriefingV2Response } from '@/lib/health-engine-v2-types';
import BriefingSlides from './BriefingSlides';

interface Props {
  lang: Lang;
  userId: string;
  hasData: boolean;
  isSample?: boolean;
}

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'chatting' | 'done';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const T: Record<Lang, Record<string, string>> = {
  en: {
    tag: 'HEALTH ENGINE 2.0',
    title: 'Your Personal Health Briefing',
    sub: 'An AI-led, auto-playing walkthrough of your health insights — powered by your latest lab results.',
    loading: 'Preparing your briefing…',
    loadingSub: 'Analyzing your biomarkers and generating personalized insights.',
    start: 'Start Briefing',
    error: 'Something went wrong',
    errorSub: 'We couldn\'t generate your briefing. Please try again.',
    retry: 'Try Again',
    noData: 'No lab data yet',
    noDataSub: 'Upload your first lab report to activate the Health Engine.',
    pause: 'Pause',
    play: 'Play',
    resumeBriefing: 'Continue Briefing',
    typeQuestion: 'Type a question about this slide…',
    send: 'Send',
    listening: 'Listening…',
    done: 'Briefing Complete',
    cachedReady: 'Your briefing is ready',
    generateNew: 'Generate new briefing',
    feat1Title: 'Biomarker Analysis',
    feat1Desc: 'All your lab values scored and explained across 9 health domains.',
    feat2Title: 'Auto-Playing Walkthrough',
    feat2Desc: 'Sit back and listen — AI narrates your results slide by slide.',
    feat3Title: 'Ask Questions',
    feat3Desc: 'Pause anytime and ask about any value, score, or recommendation.',
    disclaimer: 'This briefing is for informational purposes only and does not replace professional medical advice.',
  },
  de: {
    tag: 'HEALTH ENGINE 2.0',
    title: 'Dein persönliches Gesundheitsbriefing',
    sub: 'Ein KI-geführter, automatisch ablaufender Durchgang deiner Gesundheitserkenntnisse.',
    loading: 'Briefing wird vorbereitet…',
    loadingSub: 'Deine Biomarker werden analysiert und personalisierte Einblicke generiert.',
    start: 'Briefing starten',
    error: 'Etwas ist schiefgegangen',
    errorSub: 'Das Briefing konnte nicht erstellt werden. Bitte versuche es erneut.',
    retry: 'Erneut versuchen',
    noData: 'Noch keine Labordaten',
    noDataSub: 'Lade deinen ersten Laborbericht hoch.',
    pause: 'Pausieren',
    play: 'Abspielen',
    resumeBriefing: 'Briefing fortsetzen',
    typeQuestion: 'Stelle eine Frage zu dieser Folie…',
    send: 'Senden',
    listening: 'Wird abgespielt…',
    done: 'Briefing abgeschlossen',
    cachedReady: 'Dein Briefing ist bereit',
    generateNew: 'Neues Briefing erstellen',
    feat1Title: 'Biomarker-Analyse',
    feat1Desc: 'Alle Laborwerte bewertet und erklärt in 9 Gesundheitsbereichen.',
    feat2Title: 'Automatischer Durchgang',
    feat2Desc: 'Lehn dich zurück — die KI erzählt deine Ergebnisse Folie für Folie.',
    feat3Title: 'Fragen stellen',
    feat3Desc: 'Pausiere jederzeit und frage zu Werten, Scores oder Empfehlungen.',
    disclaimer: 'Dieses Briefing dient nur zur Information und ersetzt keine ärztliche Beratung.',
  },
  fr: {
    tag: 'HEALTH ENGINE 2.0',
    title: 'Votre Briefing Santé Personnel',
    sub: 'Un parcours automatique guidé par l\'IA de vos insights de santé.',
    loading: 'Préparation du briefing…',
    loadingSub: 'Analyse de vos biomarqueurs et génération d\'aperçus personnalisés.',
    start: 'Démarrer le briefing',
    error: 'Quelque chose s\'est mal passé',
    errorSub: 'Le briefing n\'a pas pu être généré. Veuillez réessayer.',
    retry: 'Réessayer',
    noData: 'Pas encore de données',
    noDataSub: 'Téléchargez votre premier rapport de laboratoire.',
    pause: 'Pause',
    play: 'Lecture',
    resumeBriefing: 'Continuer le briefing',
    typeQuestion: 'Posez une question sur cette diapositive…',
    send: 'Envoyer',
    listening: 'En écoute…',
    done: 'Briefing terminé',
    cachedReady: 'Votre briefing est prêt',
    generateNew: 'Générer un nouveau briefing',
    feat1Title: 'Analyse des biomarqueurs',
    feat1Desc: 'Toutes vos valeurs de laboratoire notées et expliquées dans 9 domaines de santé.',
    feat2Title: 'Parcours automatique',
    feat2Desc: 'Installez-vous — l\'IA commente vos résultats diapositive par diapositive.',
    feat3Title: 'Posez des questions',
    feat3Desc: 'Mettez en pause à tout moment et posez vos questions sur les valeurs ou recommandations.',
    disclaimer: 'Ce briefing est à titre informatif uniquement et ne remplace pas un avis médical professionnel.',
  },
  es: {
    tag: 'HEALTH ENGINE 2.0',
    title: 'Tu Informe de Salud Personal',
    sub: 'Un recorrido automático guiado por IA de tus insights de salud.',
    loading: 'Preparando tu informe…',
    loadingSub: 'Analizando tus biomarcadores y generando perspectivas personalizadas.',
    start: 'Iniciar informe',
    error: 'Algo salió mal',
    errorSub: 'No se pudo generar el informe. Inténtalo de nuevo.',
    retry: 'Reintentar',
    noData: 'Sin datos de laboratorio',
    noDataSub: 'Sube tu primer informe de laboratorio.',
    pause: 'Pausar',
    play: 'Reproducir',
    resumeBriefing: 'Continuar informe',
    typeQuestion: 'Haz una pregunta sobre esta diapositiva…',
    send: 'Enviar',
    listening: 'Escuchando…',
    done: 'Informe completado',
    cachedReady: 'Tu informe está listo',
    generateNew: 'Generar nuevo informe',
    feat1Title: 'Análisis de biomarcadores',
    feat1Desc: 'Todos tus valores de laboratorio puntuados y explicados en 9 dominios de salud.',
    feat2Title: 'Recorrido automático',
    feat2Desc: 'Relájate — la IA narra tus resultados diapositiva por diapositiva.',
    feat3Title: 'Haz preguntas',
    feat3Desc: 'Pausa en cualquier momento y pregunta sobre valores, puntuaciones o recomendaciones.',
    disclaimer: 'Este informe es solo informativo y no reemplaza el consejo médico profesional.',
  },
  it: {
    tag: 'HEALTH ENGINE 2.0',
    title: 'Il Tuo Briefing Salute Personale',
    sub: 'Un percorso automatico guidato dall\'IA dei tuoi insight di salute.',
    loading: 'Preparazione del briefing…',
    loadingSub: 'Analisi dei biomarcatori e generazione di approfondimenti personalizzati.',
    start: 'Avvia briefing',
    error: 'Qualcosa è andato storto',
    errorSub: 'Non è stato possibile generare il briefing. Riprova.',
    retry: 'Riprova',
    noData: 'Nessun dato di laboratorio',
    noDataSub: 'Carica il tuo primo referto di laboratorio.',
    pause: 'Pausa',
    play: 'Riproduci',
    resumeBriefing: 'Continua briefing',
    typeQuestion: 'Fai una domanda su questa diapositiva…',
    send: 'Invia',
    listening: 'In riproduzione…',
    done: 'Briefing completato',
    cachedReady: 'Il tuo briefing è pronto',
    generateNew: 'Genera nuovo briefing',
    feat1Title: 'Analisi dei biomarcatori',
    feat1Desc: 'Tutti i tuoi valori di laboratorio valutati e spiegati in 9 domini di salute.',
    feat2Title: 'Percorso automatico',
    feat2Desc: 'Rilassati — l\'IA commenta i tuoi risultati diapositiva per diapositiva.',
    feat3Title: 'Fai domande',
    feat3Desc: 'Metti in pausa in qualsiasi momento e chiedi di valori, punteggi o raccomandazioni.',
    disclaimer: 'Questo briefing è solo a scopo informativo e non sostituisce il parere medico professionale.',
  },
};

export default function HealthEngine2({ lang, userId, hasData, isSample }: Props) {
  const t = T[lang];
  const [playbackState, setPlaybackState] = useState<PlaybackState>(hasData ? 'idle' : 'done');
  const [slides, setSlides] = useState<BriefingSlide[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [checkingCache, setCheckingCache] = useState(hasData);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrls = useRef<Record<number, string>>({});
  const ttsAvailable = useRef<boolean | null>(null); // null=unknown, true=ElevenLabs, false=browser fallback
  const usingBrowserTTS = useRef(false);
  const isMounted = useRef(true);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const slidesRef = useRef<BriefingSlide[]>([]);

  // Keep slidesRef in sync so callbacks can read current slides without stale closures
  slidesRef.current = slides;

  // ── Check on mount if a cached briefing exists ────────────────
  useEffect(() => {
    if (!hasData) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ai/briefing-v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lang, cacheOnly: true }),
        });
        if (!res.ok || cancelled) return;
        const data: BriefingV2Response = await res.json();
        if (cancelled) return;
        if (data.cached && data.slides?.length > 0) {
          setIsCached(true);
          setSlides(data.slides);
        }
      } catch { /* ignore — will just show Start Briefing */ }
      finally { if (!cancelled) setCheckingCache(false); }
    })();
    return () => { cancelled = true; };
  }, [hasData, lang]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      // Cleanup audio on unmount
      window.speechSynthesis?.cancel();
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
      // Revoke blob URLs
      Object.values(audioBlobUrls.current).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const currentSlide = slides[currentSlideIndex];

  // ── Helper: safely stop current audio ─────────────────────────
  const stopCurrentAudio = useCallback(async () => {
    // Wait for any pending play() promise to settle before pausing
    if (playPromiseRef.current) {
      try { await playPromiseRef.current; } catch { /* ignore AbortError */ }
      playPromiseRef.current = null;
    }
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load(); // reset
    }
  }, []);

  // ── Advance to next slide or finish ───────────────────────────
  const advanceSlide = useCallback((fromIndex: number) => {
    if (!isMounted.current) return;
    const total = slidesRef.current.length;
    if (fromIndex < total - 1) {
      setTimeout(() => { if (isMounted.current) setCurrentSlideIndex(fromIndex + 1); }, 800);
    } else {
      setPlaybackState('done');
    }
  }, []);

  // ── TTS: Fetch audio for a slide ──────────────────────────────
  const fetchAudio = useCallback(async (stepIndex: number, narration: string): Promise<string | null> => {
    if (audioBlobUrls.current[stepIndex]) return audioBlobUrls.current[stepIndex];
    if (ttsAvailable.current === false) return null;

    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: narration, lang }),
      });
      if (!res.ok) {
        ttsAvailable.current = false;
        return null;
      }
      ttsAvailable.current = true;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      audioBlobUrls.current[stepIndex] = url;
      return url;
    } catch {
      ttsAvailable.current = false;
      return null;
    }
  }, [lang]);

  // ── Browser TTS fallback ──────────────────────────────────────
  const playBrowserTTS = useCallback((text: string, slideIndex: number) => {
    if (!('speechSynthesis' in window)) {
      // No TTS at all — auto-advance after estimated reading time
      const readTime = Math.max(3000, text.split(' ').length * 250);
      setTimeout(() => advanceSlide(slideIndex), readTime);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'de' ? 'de-DE' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : lang === 'it' ? 'it-IT' : 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => advanceSlide(slideIndex);
    window.speechSynthesis.speak(utterance);
  }, [lang, advanceSlide]);

  // ── Play the current slide's narration ────────────────────────
  const playSlideAudio = useCallback(async (slideIndex: number) => {
    const slide = slidesRef.current[slideIndex];
    if (!slide?.narration) {
      // No narration — just advance
      advanceSlide(slideIndex);
      return;
    }

    // Stop anything currently playing
    await stopCurrentAudio();

    const audioUrl = await fetchAudio(slideIndex, slide.narration);

    if (audioUrl) {
      usingBrowserTTS.current = false;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Attach ended listener BEFORE calling play()
      audio.addEventListener('ended', () => advanceSlide(slideIndex), { once: true });

      // Play and store the promise so we can await it before pausing
      playPromiseRef.current = audio.play();
      try {
        await playPromiseRef.current;
      } catch {
        // Autoplay blocked or AbortError — fall back to browser TTS
        usingBrowserTTS.current = true;
        playBrowserTTS(slide.narration, slideIndex);
      }
      playPromiseRef.current = null;

      // Pre-fetch next slide audio
      const nextSlide = slidesRef.current[slideIndex + 1];
      if (nextSlide?.narration) fetchAudio(slideIndex + 1, nextSlide.narration);
    } else {
      // Browser SpeechSynthesis fallback
      usingBrowserTTS.current = true;
      playBrowserTTS(slide.narration, slideIndex);
    }
  }, [fetchAudio, playBrowserTTS, stopCurrentAudio, advanceSlide]);

  // ── Auto-play: when slide changes and playing, start audio ────
  useEffect(() => {
    if (playbackState !== 'playing' || !currentSlide) return;
    playSlideAudio(currentSlideIndex);
  }, [currentSlideIndex, playbackState, currentSlide, playSlideAudio]);

  const startBriefing = useCallback(async () => {
    setError(null);
    setCurrentSlideIndex(0);
    setChatMessages([]);

    // If we already pre-loaded cached slides, skip the API call entirely
    if (isCached && slides.length > 0) {
      setPlaybackState('playing');
      return;
    }

    setPlaybackState('loading');

    try {
      const res = await fetch('/api/ai/briefing-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data: BriefingV2Response = await res.json();
      setSlides(data.slides);
      setIsCached(data.cached);
      setCurrentSlideIndex(0);
      setPlaybackState('playing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPlaybackState('idle');
    }
  }, [lang, isCached, slides.length]);

  const handlePlayPause = useCallback(async () => {
    if (playbackState === 'playing') {
      setPlaybackState('paused');
      if (usingBrowserTTS.current) {
        window.speechSynthesis?.pause();
      } else {
        // Await the play promise to avoid AbortError
        if (playPromiseRef.current) {
          try { await playPromiseRef.current; } catch { /* ignore */ }
          playPromiseRef.current = null;
        }
        audioRef.current?.pause();
      }
    } else if (playbackState === 'paused' || playbackState === 'chatting') {
      setPlaybackState('playing');
      if (usingBrowserTTS.current) {
        window.speechSynthesis?.resume();
      } else if (audioRef.current && audioRef.current.src) {
        playPromiseRef.current = audioRef.current.play();
        try { await playPromiseRef.current; } catch { /* ignore */ }
        playPromiseRef.current = null;
      } else {
        // Audio was lost — re-trigger from current slide
        playSlideAudio(currentSlideIndex);
      }
    }
  }, [playbackState, currentSlideIndex, playSlideAudio]);

  const handleSendQuestion = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const questionText = chatInput;

    // Pause audio when user asks a question
    if (usingBrowserTTS.current) {
      window.speechSynthesis?.pause();
    } else {
      if (playPromiseRef.current) {
        try { await playPromiseRef.current; } catch { /* ignore */ }
        playPromiseRef.current = null;
      }
      audioRef.current?.pause();
    }

    const userMessage: ChatMessage = { role: 'user', text: questionText };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setPlaybackState('chatting');
    setChatLoading(true);

    try {
      // Build context from current slide
      const slideContext = currentSlide
        ? `Current slide: ${currentSlide.type}. Narration: ${currentSlide.narration || 'N/A'}`
        : '';

      // The chat API expects { messages, context, lang, mode } and returns an SSE stream
      const allMessages = [
        ...chatMessages.map(m => ({ role: m.role, content: m.text })),
        { role: 'user' as const, content: questionText },
      ];

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages,
          context: slideContext,
          lang,
          mode: 'briefing',
        }),
      });

      if (!res.ok) throw new Error('Chat failed');

      // Parse the SSE stream
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantText = '';
      // Add placeholder message
      setChatMessages((prev) => [...prev, { role: 'assistant', text: '' }]);

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') { done = true; break; }
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  assistantText += parsed.text;
                  setChatMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', text: assistantText };
                    return updated;
                  });
                }
                if (parsed.error) throw new Error(parsed.error);
              } catch { /* skip malformed lines */ }
            }
          }
        }
      }
    } catch (err) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        text: err instanceof Error ? err.message : 'Failed to process question',
      };
      setChatMessages((prev) => {
        // Replace placeholder if it exists with empty text, otherwise append
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.text) {
          return [...prev.slice(0, -1), errorMessage];
        }
        return [...prev, errorMessage];
      });
    } finally {
      setChatLoading(false);
    }
  };

  const resumeBriefing = useCallback(async () => {
    setPlaybackState('playing');
    if (usingBrowserTTS.current) {
      window.speechSynthesis?.resume();
    } else if (audioRef.current && audioRef.current.src) {
      playPromiseRef.current = audioRef.current.play();
      try { await playPromiseRef.current; } catch { /* ignore */ }
      playPromiseRef.current = null;
    } else {
      // Audio was lost — re-trigger playback for current slide
      playSlideAudio(currentSlideIndex);
    }
  }, [currentSlideIndex, playSlideAudio]);

  // ── No data state ─────────────────────────────────────────────
  if (!hasData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-[#0e393d]/[.06] flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ceab84" strokeWidth="1.5">
              <path d="M9 17H7A5 5 0 017 7h2M15 7h2a5 5 0 010 10h-2M8 12h8" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="font-serif text-2xl text-[#0e393d] mb-2">{t.noData}</h2>
          <p className="text-sm text-[#1c2a2b]/50">{t.noDataSub}</p>
        </div>
      </div>
    );
  }

  const isActive = playbackState === 'playing' || playbackState === 'paused' || playbackState === 'chatting';
  const progressPct = slides.length > 0 ? ((currentSlideIndex + 1) / slides.length) * 100 : 0;

  return (
    <div className="bg-[#fafaf8] flex flex-col min-h-screen">
      {/* ── Idle / Loading: Full-screen cinema hero ────────────── */}
      {(playbackState === 'idle' || playbackState === 'loading') && (
        <div className="bg-[#0e393d] flex-1 flex flex-col">
          <div className="max-w-[1040px] mx-auto w-full px-6 md:px-10 pt-28 pb-8">
            <p className="text-[10px] font-semibold tracking-[.2em] uppercase text-[#ceab84] mb-3">
              {t.tag}
            </p>
            <h1 className="font-serif text-[clamp(2.2rem,4vw,3rem)] text-white leading-[1.1] mb-4">{t.title}</h1>
            <p className="text-[15px] text-white/50 max-w-2xl leading-relaxed font-light">{t.sub}</p>
          </div>

          {/* Center the CTA + cards in remaining space */}
          <div className="flex-1 flex items-center justify-center px-6 md:px-10 pb-12">
            <div className="max-w-2xl w-full flex flex-col items-center">
              {playbackState === 'idle' && (
                <>
                  {/* Main CTA area */}
                  <div className="text-center mb-10">
                    {isCached && (
                      <p className="text-xs text-[#0C9C6C] font-medium mb-4 flex items-center justify-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0C9C6C] animate-pulse" />
                        {t.cachedReady}
                      </p>
                    )}

                    <button
                      onClick={startBriefing}
                      disabled={checkingCache}
                      className="group inline-flex items-center gap-3 px-10 py-4 rounded-2xl text-base font-semibold text-[#0e393d] bg-[#ceab84] hover:bg-[#ceab84]/90 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                    >
                      <span className="w-10 h-10 rounded-full bg-[#0e393d]/10 flex items-center justify-center group-hover:bg-[#0e393d]/15 transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                      {checkingCache ? '…' : isCached ? t.play : t.start}
                    </button>

                    {isCached && (
                      <button
                        onClick={() => { setIsCached(false); setSlides([]); }}
                        className="block mx-auto mt-3 text-xs text-white/30 hover:text-white/50 underline underline-offset-2 transition-colors"
                      >
                        {t.generateNew}
                      </button>
                    )}
                  </div>

                  {/* Feature highlights */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full">
                    <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-white/[.06] border border-white/[.06]">
                      <div className="w-10 h-10 rounded-xl bg-white/[.08] flex items-center justify-center mb-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ceab84" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-white/90 mb-1">{t.feat1Title}</h3>
                      <p className="text-xs text-white/40 leading-relaxed">{t.feat1Desc}</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-white/[.06] border border-white/[.06]">
                      <div className="w-10 h-10 rounded-xl bg-white/[.08] flex items-center justify-center mb-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ceab84" strokeWidth="1.5" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-white/90 mb-1">{t.feat2Title}</h3>
                      <p className="text-xs text-white/40 leading-relaxed">{t.feat2Desc}</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-white/[.06] border border-white/[.06]">
                      <div className="w-10 h-10 rounded-xl bg-white/[.08] flex items-center justify-center mb-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ceab84" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-white/90 mb-1">{t.feat3Title}</h3>
                      <p className="text-xs text-white/40 leading-relaxed">{t.feat3Desc}</p>
                    </div>
                  </div>

                  {/* Subtle disclaimer */}
                  <p className="mt-8 text-[11px] text-white/20 text-center max-w-md leading-relaxed">
                    {t.disclaimer}
                  </p>
                </>
              )}

              {playbackState === 'loading' && (
                <div className="text-center">
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full border-2 border-[#ceab84]/30 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-2 border-[#ceab84]/50 animate-ping" style={{ animationDelay: '0.3s' }} />
                    <div className="absolute inset-4 rounded-full bg-[#ceab84]/10 flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ceab84" strokeWidth="2" className="animate-spin" style={{ animationDuration: '3s' }}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                  <h2 className="font-serif text-xl text-white mb-2">{t.loading}</h2>
                  <p className="text-sm text-white/40">{t.loadingSub}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Active / Done: Teal header band + cream content ───── */}
      {(isActive || playbackState === 'done' || (playbackState === 'idle' && error)) && (
        <>
          <div className="bg-[#0e393d]">
            <div className="max-w-[1040px] mx-auto px-6 md:px-10 pt-28 pb-6">
              <p className="text-[10px] font-semibold tracking-[.2em] uppercase text-[#ceab84] mb-3">
                {t.tag}
              </p>
              {isActive && currentSlide && (
                <>
                  <h1 className="font-serif text-2xl text-white leading-[1.1] mb-2">
                    {currentSlide.title}
                  </h1>
                  <p className="text-[11px] text-white/40">
                    {currentSlideIndex + 1} of {slides.length}
                  </p>
                </>
              )}
              {playbackState === 'done' && (
                <h1 className="font-serif text-[clamp(2.2rem,4vw,3rem)] text-white leading-[1.1]">{t.done}</h1>
              )}
            </div>
            {/* Progress bar — full-width at bottom of teal band */}
            {isActive && (
              <div className="h-1 bg-white/10">
                <div
                  className="h-full bg-[#ceab84] transition-all duration-700 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Main Content — for active/done states */}
      {(isActive || playbackState === 'done' || (playbackState === 'idle' && error)) && (
        <div className="max-w-[1040px] mx-auto w-full px-6 md:px-10 py-16 flex-1 flex flex-col">

        {/* ── Briefing (Auto-play) ────────────────────────────── */}
        {isActive && currentSlide && (
          <div className="flex-1 flex flex-col gap-6 w-full">
            {/* Slide Card */}
            <BriefingSlides
              slide={currentSlide}
              lang={lang}
              narrationText={currentSlide.narration || ''}
              isPlaying={playbackState === 'playing'}
            />

            {/* Chat Messages */}
            {chatMessages.length > 0 && (
              <div className="space-y-4 max-h-48 overflow-y-auto bg-[#fafaf8] p-4 rounded-lg border border-[#0e393d]/10">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-[#ceab84] text-[#0e393d]'
                          : 'bg-[#0e393d]/10 text-[#1c2a2b]'
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Continue button (if chatting) */}
            {playbackState === 'chatting' && (
              <button
                onClick={resumeBriefing}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-[#0e393d] bg-[#ceab84] hover:bg-[#ceab84]/90 transition-all"
              >
                {t.resumeBriefing}
              </button>
            )}
          </div>
        )}

        {/* ── Done ────────────────────────────────────────────── */}
        {playbackState === 'done' && (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-[#0C9C6C]/10 flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#0C9C6C">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
              <h2 className="font-serif text-2xl text-[#0e393d] mb-3">{t.done}</h2>
              <p className="text-sm text-[#1c2a2b]/60 mb-6">
                Your personalized health briefing has been completed.
              </p>
              <button
                onClick={() => { setIsCached(true); setPlaybackState('idle'); }}
                className="w-full px-6 py-2.5 rounded-lg text-sm font-semibold text-[#0e393d] bg-[#ceab84] hover:bg-[#ceab84]/90 transition-all"
              >
                {t.play}
              </button>
            </div>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────── */}
        {error && playbackState === 'idle' && (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-[#E06B5B]/10 flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E06B5B" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="font-serif text-xl text-[#0e393d] mb-2">{t.error}</h2>
              <p className="text-sm text-[#1c2a2b]/50 mb-4">{error || t.errorSub}</p>
              <button
                onClick={() => { setError(null); setPlaybackState('idle'); }}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-[#0e393d] bg-[#ceab84] hover:bg-[#ceab84]/90 transition-all"
              >
                {t.retry}
              </button>
            </div>
          </div>
        )}
        </div>
      )}

      {/* Sticky Bottom Controls */}
      {isActive && (
        <div className="sticky bottom-0 left-0 right-0 bg-[#fafaf8] border-t border-[#0e393d]/10 p-4 shadow-lg">
          <div className="max-w-[1040px] mx-auto flex gap-3">
            {/* Chat Input */}
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendQuestion()}
                placeholder={t.typeQuestion}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm border border-[#0e393d]/10 bg-white text-[#1c2a2b] placeholder-[#1c2a2b]/40 focus:outline-none focus:border-[#ceab84] focus:ring-1 focus:ring-[#ceab84]"
              />
              <button
                onClick={handleSendQuestion}
                disabled={!chatInput.trim() || chatLoading}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-[#0e393d] bg-[#ceab84] hover:bg-[#ceab84]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {chatLoading ? '…' : t.send}
              </button>
            </div>

            {/* Play/Pause Button */}
            <button
              onClick={handlePlayPause}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-[#fafaf8] bg-[#0e393d] hover:bg-[#0e393d]/90 transition-all flex items-center gap-2"
            >
              {playbackState === 'playing' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                  {t.pause}
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {t.play}
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
