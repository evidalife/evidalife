'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Lang, BriefingSlide, BriefingV2Response } from '@/lib/health-engine-v2-types';
import { buildBriefingContext } from '@/lib/briefing-context';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import dynamic from 'next/dynamic';
import BriefingSlides from './BriefingSlides';

// Lazy-load ResearchChat — only needed after briefing ends
const ResearchChat = dynamic(() => import('@/components/research/ResearchChat'), { ssr: false });

interface FlaggedMarker {
  slug: string;
  name: string;
  value: number;
  unit: string;
  status: string;
}

interface Props {
  lang: Lang;
  userId: string;
  hasData: boolean;
  isSample?: boolean;
}

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'chatting' | 'done' | 'research_prompt' | 'researching';

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
    researchTitle: 'Want to dig deeper?',
    researchSub: 'I can check what the latest peer-reviewed research says about your results. Your critical biomarker values will be matched against our database of 500,000+ studies.',
    researchDisclaimer: 'This is for educational purposes only — always discuss findings with your doctor before making changes.',
    researchConfirm: 'Yes, check the research',
    researchSkip: 'No thanks, I\'m done',
    researchLoading: 'Investigating your results…',
    researchLoadingSub: 'Searching peer-reviewed studies for your biomarkers.',
    downloadPdf: 'Download Doctor Report (PDF)',
    downloadingPdf: 'Generating PDF…',
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
    researchTitle: 'Möchtest du tiefer einsteigen?',
    researchSub: 'Ich kann prüfen, was die aktuelle Forschung zu deinen Ergebnissen sagt. Deine kritischen Biomarker werden mit über 500.000 Studien abgeglichen.',
    researchDisclaimer: 'Dies dient nur der Information — besprich Ergebnisse immer mit deinem Arzt.',
    researchConfirm: 'Ja, Forschung prüfen',
    researchSkip: 'Nein danke, ich bin fertig',
    researchLoading: 'Deine Ergebnisse werden untersucht…',
    researchLoadingSub: 'Peer-reviewed Studien werden nach deinen Biomarkern durchsucht.',
    downloadPdf: 'Arztbericht herunterladen (PDF)',
    downloadingPdf: 'PDF wird erstellt…',
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
    researchTitle: 'Vous voulez approfondir ?',
    researchSub: 'Je peux vérifier ce que la recherche récente dit de vos résultats. Vos biomarqueurs critiques seront comparés à plus de 500 000 études.',
    researchDisclaimer: 'À titre informatif uniquement — discutez toujours des résultats avec votre médecin.',
    researchConfirm: 'Oui, vérifier la recherche',
    researchSkip: 'Non merci',
    researchLoading: 'Analyse de vos résultats…',
    researchLoadingSub: 'Recherche d\'études pour vos biomarqueurs.',
    downloadPdf: 'Télécharger le rapport médecin (PDF)',
    downloadingPdf: 'Génération du PDF…',
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
    researchTitle: '¿Quieres profundizar?',
    researchSub: 'Puedo verificar lo que dice la investigación más reciente sobre tus resultados. Tus biomarcadores críticos se compararán con más de 500.000 estudios.',
    researchDisclaimer: 'Solo con fines educativos — consulta siempre con tu médico.',
    researchConfirm: 'Sí, revisar la investigación',
    researchSkip: 'No gracias',
    researchLoading: 'Investigando tus resultados…',
    researchLoadingSub: 'Buscando estudios para tus biomarcadores.',
    downloadPdf: 'Descargar informe médico (PDF)',
    downloadingPdf: 'Generando PDF…',
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
    researchTitle: 'Vuoi approfondire?',
    researchSub: 'Posso verificare cosa dice la ricerca più recente sui tuoi risultati. I tuoi biomarcatori critici verranno confrontati con oltre 500.000 studi.',
    researchDisclaimer: 'Solo a scopo educativo — discuti sempre i risultati con il tuo medico.',
    researchConfirm: 'Sì, verifica la ricerca',
    researchSkip: 'No grazie',
    researchLoading: 'Sto analizzando i tuoi risultati…',
    researchLoadingSub: 'Ricerca di studi per i tuoi biomarcatori.',
    downloadPdf: 'Scarica rapporto medico (PDF)',
    downloadingPdf: 'Generazione PDF…',
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
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrls = useRef<Record<number, string>>({});
  const audioFetchPromises = useRef<Record<number, Promise<string | null>>>({});
  const ttsAvailable = useRef<boolean | null>(null); // null=unknown, true=server TTS, false=browser fallback
  const usingBrowserTTS = useRef(false);
  const isMounted = useRef(true);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const slidesRef = useRef<BriefingSlide[]>([]);
  const prefetchedUpTo = useRef(-1); // tracks how far ahead we've pre-fetched

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

  // ── Extract flagged markers from briefing slides for research handoff ──
  const extractFlaggedMarkers = useCallback((): FlaggedMarker[] => {
    const markers: FlaggedMarker[] = [];
    for (const slide of slidesRef.current) {
      if (slide.type === 'domain_summary') {
        const data = slide.data as import('@/lib/health-engine-v2-types').DomainSummaryData;
        for (const m of data.criticalMarkers || []) {
          markers.push({
            slug: m.slug,
            name: m.name,
            value: m.value,
            unit: m.unit,
            status: m.status,
          });
        }
      }
    }
    return markers;
  }, []);

  const [researchMarkers, setResearchMarkers] = useState<FlaggedMarker[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);

  // ── Download doctor-ready PDF report ──────────────────────────
  const downloadPdfReport = useCallback(async () => {
    setPdfLoading(true);
    try {
      const res = await fetch('/api/ai/briefing-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang }),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'Health-Report.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[PDF]', err);
    } finally {
      setPdfLoading(false);
    }
  }, [lang]);

  // ── Advance to next slide or finish ───────────────────────────
  const advanceSlide = useCallback((fromIndex: number) => {
    if (!isMounted.current) return;
    const total = slidesRef.current.length;
    if (fromIndex < total - 1) {
      setTimeout(() => { if (isMounted.current) setCurrentSlideIndex(fromIndex + 1); }, 800);
    } else {
      // Extract critical markers and show research prompt if any exist
      const flagged = extractFlaggedMarkers();
      setResearchMarkers(flagged);
      if (flagged.length > 0) {
        setPlaybackState('research_prompt');
      } else {
        setPlaybackState('done');
      }
    }
  }, [extractFlaggedMarkers]);

  // ── TTS: Fetch audio for a slide (with retry + dedup) ─────────
  const fetchAudio = useCallback(async (stepIndex: number, narration: string): Promise<string | null> => {
    // Already cached
    if (audioBlobUrls.current[stepIndex]) return audioBlobUrls.current[stepIndex];
    if (ttsAvailable.current === false) return null;

    // Deduplicate: if already fetching this slide, return existing promise
    if (stepIndex in audioFetchPromises.current) {
      return audioFetchPromises.current[stepIndex];
    }

    const doFetch = async (): Promise<string | null> => {
      const MAX_RETRIES = 2;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const res = await fetch('/api/ai/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: narration, lang }),
          });
          if (!res.ok) {
            // If all TTS providers failed (502), try once more then give up
            if (res.status === 502 && attempt < MAX_RETRIES) {
              await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
              continue;
            }
            ttsAvailable.current = false;
            return null;
          }
          ttsAvailable.current = true;
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          audioBlobUrls.current[stepIndex] = url;
          return url;
        } catch {
          if (attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
            continue;
          }
          ttsAvailable.current = false;
          return null;
        }
      }
      return null;
    };

    const promise = doFetch();
    audioFetchPromises.current[stepIndex] = promise;
    const result = await promise;
    delete audioFetchPromises.current[stepIndex];
    return result;
  }, [lang]);

  // ── Pre-fetch batch: fetch audio for multiple upcoming slides ──
  const prefetchBatch = useCallback((fromIndex: number, count: number) => {
    const allSlides = slidesRef.current;
    const end = Math.min(fromIndex + count, allSlides.length);
    for (let i = fromIndex; i < end; i++) {
      if (i <= prefetchedUpTo.current) continue;
      const s = allSlides[i];
      if (s?.narration && !audioBlobUrls.current[i]) {
        fetchAudio(i, s.narration); // fire-and-forget
      }
    }
    prefetchedUpTo.current = Math.max(prefetchedUpTo.current, end - 1);
  }, [fetchAudio]);

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
    setAudioLoading(true);

    const audioUrl = await fetchAudio(slideIndex, slide.narration);

    if (audioUrl) {
      usingBrowserTTS.current = false;
      setAudioLoading(false);

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

      // Rolling pre-fetch: fetch the next 3 slides' audio
      prefetchBatch(slideIndex + 1, 3);
    } else {
      setAudioLoading(false);
      // Browser SpeechSynthesis fallback
      usingBrowserTTS.current = true;
      playBrowserTTS(slide.narration, slideIndex);
    }
  }, [fetchAudio, playBrowserTTS, stopCurrentAudio, advanceSlide, prefetchBatch]);

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
      // Kick off pre-fetch for first 3 slides before playback starts
      prefetchBatch(0, 3);
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
      slidesRef.current = data.slides; // sync immediately for prefetch
      setIsCached(data.cached);
      setCurrentSlideIndex(0);
      // Pre-fetch first 3 slides immediately
      prefetchBatch(0, 3);
      setPlaybackState('playing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPlaybackState('idle');
    }
  }, [lang, isCached, slides.length, prefetchBatch]);

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
      // Build full briefing context with all slides + highlight current
      const slideContext = slides.length > 0
        ? buildBriefingContext(slides, currentSlideIndex)
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

  // ── Navigate to a specific slide (from chat suggestion) ──────
  const goToSlide = useCallback(async (slideIndex: number) => {
    if (slideIndex < 0 || slideIndex >= slidesRef.current.length) return;
    await stopCurrentAudio();
    setCurrentSlideIndex(slideIndex);
    setPlaybackState('playing');
  }, [stopCurrentAudio]);

  // ── Voice conversation: speak a question, get a spoken answer ──
  const [voiceResponseLoading, setVoiceResponseLoading] = useState(false);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const bridgeAudioCache = useRef<Record<string, string>>({}); // pre-fetched bridge phrase blob URLs
  // Track the playback state we should return to after voice Q&A
  const preVoiceStateRef = useRef<PlaybackState>('playing');

  // ── Bridge phrases — short filler audio to play while answer loads ──
  const BRIDGE_PHRASES: Record<string, string[]> = {
    en: [
      'Great question — let me pull that up for you.',
      'Sure, let me check those values.',
      'Good one — give me just a moment.',
      'Let me take a closer look at that.',
    ],
    de: [
      'Gute Frage — ich schaue mir das mal an.',
      'Einen Moment, ich prüfe die Werte.',
      'Guter Punkt — lass mich kurz nachsehen.',
      'Moment, ich schaue mir das genauer an.',
    ],
    fr: [
      'Bonne question — laissez-moi vérifier.',
      'Un instant, je regarde les valeurs.',
      'Bonne remarque — un moment s\'il vous plaît.',
    ],
    es: [
      'Buena pregunta — déjame revisar eso.',
      'Un momento, reviso los valores.',
      'Buen punto — déjame verificar.',
    ],
    it: [
      'Buona domanda — lasciate che controlli.',
      'Un momento, verifico i valori.',
      'Buon punto — un attimo per favore.',
    ],
  };

  // Pre-fetch bridge phrases for the current language when briefing loads
  useEffect(() => {
    if (!slides.length) return;
    const phrases = BRIDGE_PHRASES[lang] || BRIDGE_PHRASES.en;
    // Pre-fetch all bridge phrases in sequence (low priority, staggered)
    let cancelled = false;
    (async () => {
      for (let i = 0; i < phrases.length; i++) {
        if (cancelled) break;
        const text = phrases[i];
        if (bridgeAudioCache.current[text]) continue;
        try {
          // Stagger requests to avoid overwhelming TTS API
          if (i > 0) await new Promise(r => setTimeout(r, 1000));
          if (cancelled) break;
          const res = await fetch('/api/ai/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, lang }),
          });
          if (res.ok) {
            const blob = await res.blob();
            bridgeAudioCache.current[text] = URL.createObjectURL(blob);
          }
        } catch { /* ignore */ }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length, lang]);

  /** Play a short bridge phrase while the real answer is loading */
  const playBridgePhrase = useCallback(async (): Promise<void> => {
    const phrases = BRIDGE_PHRASES[lang] || BRIDGE_PHRASES.en;
    const text = phrases[Math.floor(Math.random() * phrases.length)];

    // Try cached audio first
    let url = bridgeAudioCache.current[text];
    if (!url) {
      // Try to fetch quickly — but don't block for too long
      try {
        const res = await Promise.race([
          fetch('/api/ai/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, lang }),
          }),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 2000)),
        ]);
        if (res && (res as Response).ok) {
          const blob = await (res as Response).blob();
          url = URL.createObjectURL(blob);
          bridgeAudioCache.current[text] = url;
        }
      } catch { /* ignore — will fall back to browser TTS */ }
    }

    if (url) {
      const audio = new Audio(url);
      voiceAudioRef.current = audio;
      return new Promise<void>((resolve) => {
        audio.addEventListener('ended', () => resolve(), { once: true });
        audio.addEventListener('error', () => resolve(), { once: true });
        audio.play().catch(() => resolve());
      });
    } else if ('speechSynthesis' in window) {
      // Instant fallback: browser TTS for the bridge phrase
      return new Promise<void>((resolve) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'de' ? 'de-DE' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : lang === 'it' ? 'it-IT' : 'en-US';
        utterance.rate = 1.0;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const handleVoiceQuestion = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;

    // Remember what state to resume after the voice answer
    preVoiceStateRef.current = playbackState === 'playing' ? 'playing' : 'paused';

    // Pause narration
    if (usingBrowserTTS.current) {
      window.speechSynthesis?.pause();
    } else {
      if (playPromiseRef.current) {
        try { await playPromiseRef.current; } catch { /* ignore */ }
        playPromiseRef.current = null;
      }
      audioRef.current?.pause();
    }

    // Add user message to chat
    const userMessage: ChatMessage = { role: 'user', text: transcript };
    setChatMessages((prev) => [...prev, userMessage]);
    setPlaybackState('chatting');
    setChatLoading(true);
    setVoiceResponseLoading(true);

    // Play a bridge phrase while we fetch the real answer
    const bridgePromise = playBridgePhrase();

    try {
      // Build context
      const slideContext = slides.length > 0
        ? buildBriefingContext(slides, currentSlideIndex)
        : '';

      const allMessages = [
        ...chatMessages.map(m => ({ role: m.role, content: m.text })),
        { role: 'user' as const, content: transcript },
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

      // Stream the text response
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantText = '';
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

      // Strip [[SLIDE:N]] markers before speaking
      const cleanText = assistantText.replace(/\s*\[\[SLIDE:\d+\]\]\s*/g, '').trim();

      // Handle slide navigation if present
      const slideMatch = assistantText.match(/\[\[SLIDE:(\d+)\]\]/);
      if (slideMatch) {
        const target = parseInt(slideMatch[1], 10) - 1;
        if (target >= 0 && target < slides.length && target !== currentSlideIndex) {
          await stopCurrentAudio();
          setCurrentSlideIndex(target);
        }
      }

      // Wait for bridge phrase to finish before speaking the answer
      await bridgePromise;

      // Now speak the response via TTS
      if (cleanText) {
        try {
          const ttsRes = await fetch('/api/ai/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanText, lang }),
          });

          if (ttsRes.ok) {
            const blob = await ttsRes.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            voiceAudioRef.current = audio;

            // When the voice response finishes, resume briefing
            audio.addEventListener('ended', () => {
              URL.revokeObjectURL(url);
              voiceAudioRef.current = null;
              setVoiceResponseLoading(false);
              // Auto-resume the briefing narration
              if (preVoiceStateRef.current === 'playing') {
                setPlaybackState('playing');
                if (usingBrowserTTS.current) {
                  window.speechSynthesis?.resume();
                } else if (audioRef.current && audioRef.current.src) {
                  playPromiseRef.current = audioRef.current.play();
                  playPromiseRef.current?.catch(() => { /* ignore */ });
                } else {
                  playSlideAudio(currentSlideIndex);
                }
              } else {
                setPlaybackState('paused');
              }
            }, { once: true });

            setVoiceResponseLoading(false);
            setChatLoading(false);
            await audio.play();
            return; // the 'ended' handler takes care of resuming
          }
        } catch {
          // TTS failed — fall through to text-only mode
        }
      }

      // If TTS failed or no text, just stay in chatting mode
      setVoiceResponseLoading(false);
    } catch (err) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        text: err instanceof Error ? err.message : 'Failed to process question',
      };
      setChatMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.text) {
          return [...prev.slice(0, -1), errorMessage];
        }
        return [...prev, errorMessage];
      });
      setVoiceResponseLoading(false);
    } finally {
      setChatLoading(false);
    }
  }, [slides, currentSlideIndex, chatMessages, lang, playbackState, stopCurrentAudio, playSlideAudio, playBridgePhrase]);

  // Initialize voice input hook
  const {
    supported: voiceSupported,
    isListening,
    interimTranscript,
    toggleListening: rawToggleListening,
  } = useVoiceInput({
    lang,
    onResult: handleVoiceQuestion,
  });

  // Wrap toggle to also pause narration when mic activates
  const toggleVoiceMic = useCallback(async () => {
    if (!isListening) {
      // About to start listening — pause narration
      if (playbackState === 'playing') {
        if (usingBrowserTTS.current) {
          window.speechSynthesis?.pause();
        } else {
          if (playPromiseRef.current) {
            try { await playPromiseRef.current; } catch { /* ignore */ }
            playPromiseRef.current = null;
          }
          audioRef.current?.pause();
        }
      }
    }
    rawToggleListening();
  }, [isListening, playbackState, rawToggleListening]);

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

      {/* ── Active / Done / Research: Teal header band + cream content ───── */}
      {(isActive || playbackState === 'done' || playbackState === 'research_prompt' || playbackState === 'researching' || (playbackState === 'idle' && error)) && (
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
              {(playbackState === 'research_prompt' || playbackState === 'researching') && (
                <h1 className="font-serif text-[clamp(2.2rem,4vw,3rem)] text-white leading-[1.1]">
                  {playbackState === 'researching' ? t.researchLoading : t.researchTitle}
                </h1>
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

      {/* Main Content — for active/done/research states */}
      {(isActive || playbackState === 'done' || playbackState === 'research_prompt' || playbackState === 'researching' || (playbackState === 'idle' && error)) && (
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
              audioLoading={audioLoading}
            />

            {/* Chat Messages */}
            {chatMessages.length > 0 && (
              <div className="space-y-4 max-h-48 overflow-y-auto bg-[#fafaf8] p-4 rounded-lg border border-[#0e393d]/10">
                {chatMessages.map((msg, idx) => {
                  // Parse [[SLIDE:N]] markers from assistant messages
                  const slideMatch = msg.role === 'assistant' ? msg.text.match(/\[\[SLIDE:(\d+)\]\]/) : null;
                  const slideTarget = slideMatch ? parseInt(slideMatch[1], 10) - 1 : null; // convert 1-based to 0-based
                  const displayText = slideMatch ? msg.text.replace(/\s*\[\[SLIDE:\d+\]\]\s*/, '').trim() : msg.text;
                  const targetSlide = slideTarget !== null && slideTarget >= 0 && slideTarget < slides.length
                    ? slides[slideTarget] : null;

                  return (
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
                        <p className="text-sm">{displayText}</p>
                        {targetSlide && slideTarget != null && slideTarget !== currentSlideIndex && (
                          <button
                            onClick={() => goToSlide(slideTarget!)}
                            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#0e393d]/70 hover:text-[#0e393d] transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                            Go to: {targetSlide.title}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
              <div className="flex flex-col gap-3">
                <button
                  onClick={downloadPdfReport}
                  disabled={pdfLoading}
                  className="w-full px-6 py-2.5 rounded-lg text-sm font-semibold text-[#0e393d] bg-[#ceab84] hover:bg-[#ceab84]/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {pdfLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#0e393d]/30 border-t-[#0e393d] rounded-full animate-spin" />
                      {t.downloadingPdf}
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      {t.downloadPdf}
                    </>
                  )}
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setIsCached(true); setPlaybackState('idle'); }}
                    className="flex-1 px-6 py-2.5 rounded-lg text-sm font-medium text-[#1c2a2b]/50 hover:text-[#1c2a2b]/70 transition-all"
                  >
                    {t.play}
                  </button>
                  <a
                    href={`/${lang}/research`}
                    className="flex-1 px-6 py-2.5 rounded-lg text-sm font-medium text-[#0e393d] border border-[#0e393d]/15 hover:bg-[#0e393d]/5 transition-all text-center"
                  >
                    {lang === 'de' ? 'Freie Recherche starten' : 'Open Research Session'}
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Research Prompt ─────────────────────────────────── */}
        {playbackState === 'research_prompt' && (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center max-w-lg">
              {/* Research icon */}
              <div className="w-16 h-16 rounded-2xl bg-[#0e393d]/10 flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0e393d" strokeWidth="1.5">
                  <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <h2 className="font-serif text-2xl text-[#0e393d] mb-3">{t.researchTitle}</h2>
              <p className="text-sm text-[#1c2a2b]/60 mb-4 leading-relaxed">{t.researchSub}</p>

              {/* Show flagged markers */}
              {researchMarkers.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {researchMarkers.map(m => (
                    <span key={m.slug} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#E06B5B]/10 text-[#E06B5B]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E06B5B]" />
                      {m.name}: {m.value} {m.unit}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-xs text-[#1c2a2b]/40 mb-6 leading-relaxed">{t.researchDisclaimer}</p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    setPlaybackState('researching');
                    // Play a research bridge phrase
                    const RESEARCH_BRIDGES: Record<string, string> = {
                      en: 'Got your results. Let me search through our study database to see what the science says for your case.',
                      de: 'Ich habe deine Ergebnisse. Lass mich unsere Studiendatenbank durchsuchen, was die Wissenschaft zu deinem Fall sagt.',
                      fr: 'J\'ai vos résultats. Laissez-moi consulter notre base d\'études pour voir ce que la science dit pour votre cas.',
                      es: 'Tengo tus resultados. Déjame buscar en nuestra base de estudios qué dice la ciencia para tu caso.',
                      it: 'Ho i tuoi risultati. Lasciate che cerchi nel nostro database di studi cosa dice la scienza per il vostro caso.',
                    };
                    const text = RESEARCH_BRIDGES[lang] || RESEARCH_BRIDGES.en;
                    try {
                      const res = await fetch('/api/ai/tts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text, lang }),
                      });
                      if (res.ok) {
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const audio = new Audio(url);
                        audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
                        await audio.play();
                      }
                    } catch { /* ignore — research proceeds regardless */ }
                  }}
                  className="w-full px-6 py-3 rounded-lg text-sm font-semibold text-[#0e393d] bg-[#ceab84] hover:bg-[#ceab84]/90 transition-all shadow-sm"
                >
                  {t.researchConfirm}
                </button>
                <button
                  onClick={downloadPdfReport}
                  disabled={pdfLoading}
                  className="w-full px-6 py-2.5 rounded-lg text-sm font-medium text-[#0e393d] border border-[#0e393d]/20 hover:bg-[#0e393d]/5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {pdfLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#0e393d]/30 border-t-[#0e393d] rounded-full animate-spin" />
                      {t.downloadingPdf}
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      {t.downloadPdf}
                    </>
                  )}
                </button>
                <button
                  onClick={() => setPlaybackState('done')}
                  className="w-full px-6 py-2.5 rounded-lg text-sm font-medium text-[#1c2a2b]/50 hover:text-[#1c2a2b]/70 transition-all"
                >
                  {t.researchSkip}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Researching — embedded research chat ────────────── */}
        {playbackState === 'researching' && (
          <div className="flex-1 flex flex-col" style={{ minHeight: 'calc(100vh - 250px)' }}>
            <ResearchChat
              flaggedMarkers={researchMarkers}
            />
            {/* Link to full standalone research session */}
            <div className="text-center py-4 border-t border-[#0e393d]/10">
              <a
                href={`/${lang}/research`}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#0e393d]/60 hover:text-[#0e393d] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                </svg>
                {lang === 'de' ? 'Vollständige Forschungssitzung öffnen' : 'Open full research session'}
              </a>
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
          <div className="max-w-[1040px] mx-auto">
            {/* Voice listening indicator / interim transcript */}
            {(isListening || voiceResponseLoading) && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-[#0e393d]/5 flex items-center gap-3">
                {isListening && (
                  <>
                    <div className="flex gap-0.5 items-end h-5">
                      <div className="w-1 bg-[#E06B5B] rounded-full animate-pulse" style={{ height: '60%' }} />
                      <div className="w-1 bg-[#E06B5B] rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0.1s' }} />
                      <div className="w-1 bg-[#E06B5B] rounded-full animate-pulse" style={{ height: '40%', animationDelay: '0.2s' }} />
                      <div className="w-1 bg-[#E06B5B] rounded-full animate-pulse" style={{ height: '80%', animationDelay: '0.15s' }} />
                    </div>
                    <span className="text-sm text-[#1c2a2b]/70 italic flex-1">
                      {interimTranscript || (lang === 'de' ? 'Ich höre zu…' : 'Listening…')}
                    </span>
                  </>
                )}
                {voiceResponseLoading && !isListening && (
                  <>
                    <div className="w-4 h-4 border-2 border-[#ceab84] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-[#1c2a2b]/70">
                      {lang === 'de' ? 'Antwort wird vorbereitet…' : 'Preparing response…'}
                    </span>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {/* Chat Input */}
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendQuestion()}
                  placeholder={t.typeQuestion}
                  disabled={isListening || voiceResponseLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm border border-[#0e393d]/10 bg-white text-[#1c2a2b] placeholder-[#1c2a2b]/40 focus:outline-none focus:border-[#ceab84] focus:ring-1 focus:ring-[#ceab84] disabled:opacity-50"
                />
                <button
                  onClick={handleSendQuestion}
                  disabled={!chatInput.trim() || chatLoading || isListening || voiceResponseLoading}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium text-[#0e393d] bg-[#ceab84] hover:bg-[#ceab84]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {chatLoading ? '…' : t.send}
                </button>
              </div>

              {/* Voice Mic Button (push-to-talk) */}
              {voiceSupported && (
                <button
                  onClick={toggleVoiceMic}
                  disabled={voiceResponseLoading || chatLoading}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    isListening
                      ? 'bg-[#E06B5B] text-white animate-pulse'
                      : 'bg-[#0e393d]/10 text-[#0e393d] hover:bg-[#0e393d]/20'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isListening ? 'Stop recording' : 'Ask by voice'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </button>
              )}

              {/* Previous Chapter */}
              <button
                onClick={() => goToSlide(currentSlideIndex - 1)}
                disabled={voiceResponseLoading || currentSlideIndex <= 0}
                className="px-2.5 py-2.5 rounded-lg text-sm font-medium bg-[#0e393d]/10 text-[#0e393d] hover:bg-[#0e393d]/20 transition-all flex items-center disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous chapter"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              {/* Play/Pause Button */}
              <button
                onClick={handlePlayPause}
                disabled={voiceResponseLoading}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-[#fafaf8] bg-[#0e393d] hover:bg-[#0e393d]/90 transition-all flex items-center gap-2 disabled:opacity-50"
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

              {/* Next Chapter */}
              <button
                onClick={() => goToSlide(currentSlideIndex + 1)}
                disabled={voiceResponseLoading || currentSlideIndex >= slides.length - 1}
                className="px-2.5 py-2.5 rounded-lg text-sm font-medium bg-[#0e393d]/10 text-[#0e393d] hover:bg-[#0e393d]/20 transition-all flex items-center disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next chapter"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
