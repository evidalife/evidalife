'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

type Lang = 'en' | 'de' | 'fr' | 'es' | 'it';

interface VoiceBriefing {
  slug: string;
  title: string;
  audio_url_en: string | null;
  audio_url_de: string | null;
  audio_url_fr: string | null;
  audio_url_es: string | null;
  audio_url_it: string | null;
  script_en: string;
  script_de: string;
  script_fr: string;
  script_es: string;
  script_it: string;
}

const LABELS: Record<Lang, { listen: string; listening: string; pause: string; transcript: string }> = {
  en: { listen: 'Listen to our AI Coach', listening: 'Playing…', pause: 'Paused', transcript: 'Read transcript' },
  de: { listen: 'KI-Coach anhören', listening: 'Wird abgespielt…', pause: 'Pausiert', transcript: 'Transkript lesen' },
  fr: { listen: 'Écouter notre Coach IA', listening: 'Lecture…', pause: 'En pause', transcript: 'Lire le transcript' },
  es: { listen: 'Escuchar Coach IA', listening: 'Reproduciendo…', pause: 'En pausa', transcript: 'Leer transcripción' },
  it: { listen: 'Ascolta il Coach IA', listening: 'In riproduzione…', pause: 'In pausa', transcript: 'Leggi trascrizione' },
};

interface Props {
  lang: Lang;
  page?: string;
}

export default function HeroVoicePlayer({ lang, page = 'home' }: Props) {
  const [briefing, setBriefing] = useState<VoiceBriefing | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const [progress, setProgress] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<number>(0);
  const t = LABELS[lang] ?? LABELS.en;

  // Fetch briefing on mount
  useEffect(() => {
    fetch(`/api/voice-briefings?page=${page}`)
      .then(r => r.json())
      .then(data => {
        const b = data.briefings?.[0];
        if (b) setBriefing(b);
      })
      .catch(() => {});
  }, [page]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const getAudioUrl = useCallback(() => {
    if (!briefing) return null;
    return briefing[`audio_url_${lang}` as keyof VoiceBriefing] as string | null
      ?? briefing.audio_url_en;
  }, [briefing, lang]);

  const getScript = useCallback(() => {
    if (!briefing) return '';
    return (briefing[`script_${lang}` as keyof VoiceBriefing] as string) ?? briefing.script_en ?? '';
  }, [briefing, lang]);

  const handlePlayPause = () => {
    if (state === 'playing') {
      audioRef.current?.pause();
      setState('paused');
      return;
    }

    if (state === 'paused' && audioRef.current) {
      audioRef.current.play();
      setState('playing');
      return;
    }

    // Start fresh
    const url = getAudioUrl();
    if (!url) return;

    setState('loading');
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.oncanplay = () => {
      audio.play();
      setState('playing');
    };

    audio.ontimeupdate = () => {
      if (audio.duration) {
        const p = (audio.currentTime / audio.duration) * 100;
        progressRef.current = p;
        setProgress(p);
      }
    };

    audio.onended = () => {
      setState('idle');
      setProgress(0);
    };

    audio.onerror = () => {
      setState('idle');
    };
  };

  // Don't render if no briefing or no audio
  if (!briefing) return null;
  const audioUrl = getAudioUrl();
  // Show the player even without audio (in draft state, show script only)
  const hasAudio = !!audioUrl;
  const script = getScript();

  const isActive = state === 'playing' || state === 'paused' || state === 'loading';

  return (
    <div className="mt-6">
      {/* Main player button */}
      <div className="flex items-center gap-3">
        {hasAudio && (
          <button
            onClick={handlePlayPause}
            disabled={state === 'loading'}
            className={`group relative flex items-center gap-3 rounded-full transition-all duration-300 ${
              isActive
                ? 'bg-white/20 backdrop-blur-md pl-3 pr-5 py-2'
                : 'bg-white/10 backdrop-blur-sm hover:bg-white/20 pl-3 pr-5 py-2'
            }`}
          >
            {/* Play/Pause icon */}
            <div className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              state === 'playing' ? 'bg-[#ceab84]' : 'bg-white/20 group-hover:bg-[#ceab84]/80'
            }`}>
              {state === 'loading' ? (
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : state === 'playing' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <polygon points="8,5 20,12 8,19" />
                </svg>
              )}

              {/* Animated ring for playing state */}
              {state === 'playing' && (
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18" cy="18" r="16"
                    fill="none"
                    stroke="rgba(206,171,132,0.3)"
                    strokeWidth="2"
                  />
                  <circle
                    cx="18" cy="18" r="16"
                    fill="none"
                    stroke="#ceab84"
                    strokeWidth="2"
                    strokeDasharray="100.53"
                    strokeDashoffset={100.53 - (100.53 * progress / 100)}
                    strokeLinecap="round"
                    className="transition-[stroke-dashoffset] duration-300"
                  />
                </svg>
              )}
            </div>

            {/* Label */}
            <span className="text-white/80 text-[13px] font-light whitespace-nowrap">
              {state === 'loading' ? '…' : state === 'playing' ? t.listening : state === 'paused' ? t.pause : t.listen}
            </span>

            {/* Sound wave animation when playing */}
            {state === 'playing' && (
              <div className="flex items-center gap-[2px] ml-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="w-[2px] bg-[#ceab84] rounded-full animate-pulse"
                    style={{
                      height: `${8 + Math.random() * 8}px`,
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: '0.6s',
                    }}
                  />
                ))}
              </div>
            )}
          </button>
        )}

        {/* Transcript toggle */}
        {script && (
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-white/40 hover:text-white/70 text-[12px] font-light transition-colors"
          >
            {showTranscript ? '✕' : t.transcript}
          </button>
        )}
      </div>

      {/* Transcript overlay */}
      {showTranscript && script && (
        <div className="mt-4 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 p-5 max-h-[200px] overflow-y-auto">
          <p className="text-white/70 text-[13px] font-light leading-relaxed">{script}</p>
        </div>
      )}
    </div>
  );
}
