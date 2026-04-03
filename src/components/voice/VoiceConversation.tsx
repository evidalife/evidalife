'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { CONVERSATION_MODES, type ConversationMode } from '@/lib/voice/conversation-types';

// ── Types ───────────────────────────────────────────────────────────────────

interface Turn {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface VoiceConversationProps {
  lang?: string;
  /** If provided, starts immediately in this mode */
  initialMode?: ConversationMode;
  /** Called when session ends */
  onSessionEnd?: (summary: { durationSeconds: number; turnCount: number; mode: ConversationMode }) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function VoiceConversation({
  lang = 'en',
  initialMode,
  onSessionEnd,
}: VoiceConversationProps) {
  // ── State ───────────────────────────────────────────────────────
  const [mode, setMode] = useState<ConversationMode | null>(initialMode ?? null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'starting' | 'listening' | 'thinking' | 'speaking' | 'ended' | 'error'>('idle');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [maxDuration, setMaxDuration] = useState(120);
  const [error, setError] = useState<string | null>(null);
  const [autoListening, setAutoListening] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const turnsRef = useRef<Turn[]>([]);

  // Keep turnsRef in sync
  useEffect(() => { turnsRef.current = turns; }, [turns]);

  // ── Voice input hook ──────────────────────────────────────────────
  const handleVoiceResult = useCallback(async (transcript: string) => {
    if (!sessionId || !mode) return;

    // Add user turn
    const userTurn: Turn = { role: 'user', text: transcript, timestamp: Date.now() };
    setTurns(prev => [...prev, userTurn]);
    setStatus('thinking');

    try {
      // Build history from turns
      const history = turnsRef.current.map(t => ({
        role: t.role as 'user' | 'assistant',
        content: t.text,
      }));

      const res = await fetch('/api/ai/voice-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userText: transcript,
          history,
          lang,
          mode,
        }),
      });

      if (res.status === 410) {
        // Session expired
        setStatus('ended');
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Voice turn failed');
      }

      const data = await res.json();

      // Add assistant turn
      const assistantTurn: Turn = { role: 'assistant', text: data.text, timestamp: Date.now() };
      setTurns(prev => [...prev, assistantTurn]);

      // Update elapsed from server
      if (data.elapsed) setElapsed(data.elapsed);
      if (data.maxDuration) setMaxDuration(data.maxDuration);

      // Play audio if available
      if (data.audioBase64) {
        setStatus('speaking');
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          // Auto-listen if continuous mode is on
          if (autoListening) {
            setStatus('listening');
            startListening();
          } else {
            setStatus('idle');
          }
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          if (autoListening) {
            setStatus('listening');
            startListening();
          } else {
            setStatus('idle');
          }
        };

        await audio.play();
      } else {
        // No audio — return to idle or auto-listen
        if (autoListening) {
          setStatus('listening');
          startListening();
        } else {
          setStatus('idle');
        }
      }
    } catch (e) {
      console.error('[VoiceConversation] Turn error:', e);
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setStatus('error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, mode, lang, autoListening]);

  const { supported, isListening, interimTranscript, startListening, stopListening } = useVoiceInput({
    lang,
    continuous: true, // Keep listening in conversation mode
    onResult: handleVoiceResult,
    onError: (err) => {
      if (err !== 'no-speech' && err !== 'aborted') {
        setError(`Voice input error: ${err}`);
      }
    },
  });

  // ── Timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (sessionId && status !== 'ended' && status !== 'error') {
      timerRef.current = setInterval(() => {
        const s = Math.round((Date.now() - startTimeRef.current) / 1000);
        setElapsed(s);
        if (s >= maxDuration) {
          handleEndSession();
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, status, maxDuration]);

  // ── Session management ────────────────────────────────────────────
  const handleStartSession = async (selectedMode: ConversationMode) => {
    setStatus('starting');
    setError(null);
    setMode(selectedMode);

    try {
      const res = await fetch('/api/ai/voice-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: selectedMode, lang }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 402) {
          setError(`Not enough credits. Need ${errData.required}, have ${errData.remaining}.`);
        } else {
          setError(errData.error || 'Failed to start session');
        }
        setStatus('error');
        return;
      }

      const data = await res.json();
      setSessionId(data.sessionId);
      setMaxDuration(data.maxDurationSeconds);
      startTimeRef.current = Date.now();
      setTurns([]);
      setElapsed(0);
      setStatus('listening');

      // Auto-start listening
      startListening();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start session');
      setStatus('error');
    }
  };

  const handleEndSession = useCallback(async () => {
    // Stop everything
    stopListening();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    if (sessionId) {
      try {
        await fetch('/api/ai/voice-session', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            action: 'end',
            durationSeconds,
            turnCount: turnsRef.current.length,
          }),
        });
      } catch (e) {
        console.error('[VoiceConversation] End session error:', e);
      }
    }

    setStatus('ended');
    onSessionEnd?.({
      durationSeconds,
      turnCount: turnsRef.current.length,
      mode: mode!,
    });
  }, [sessionId, mode, stopListening, onSessionEnd]);

  // ── Helpers ───────────────────────────────────────────────────────
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = maxDuration > 0 ? Math.min(elapsed / maxDuration, 1) : 0;

  // ── Render: Mode selection ────────────────────────────────────────
  if (!sessionId && status !== 'starting') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-[#0e393d] mb-2">Voice Conversation</h2>
          <p className="text-sm text-[#1c2a2b]/50">Choose a conversation mode to start talking with your AI health coach</p>
        </div>

        <div className="grid gap-4">
          {(Object.entries(CONVERSATION_MODES) as [ConversationMode, typeof CONVERSATION_MODES[ConversationMode]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => handleStartSession(key)}
              disabled={!supported}
              className="flex items-start gap-4 p-5 rounded-xl border border-[#0e393d]/[.08] bg-white hover:border-[#0e393d]/20 hover:shadow-sm transition-all text-left disabled:opacity-40"
            >
              <span className="text-2xl">{cfg.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-[#0e393d]">{cfg.label}</span>
                  {cfg.premium && (
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 uppercase">Premium</span>
                  )}
                  <span className="text-[10px] text-[#1c2a2b]/30 ml-auto">{cfg.creditsPerSession} credit{cfg.creditsPerSession !== 1 ? 's' : ''}</span>
                </div>
                <p className="text-[12px] text-[#1c2a2b]/50 mt-1">{cfg.description}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-[#1c2a2b]/30">
                  <span>Up to {Math.round(cfg.maxDurationSeconds / 60)} min</span>
                  <span>{cfg.voiceMinutesPerSession} voice min</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {!supported && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[12px] text-amber-700 text-center">
            Your browser does not support the Web Speech API. Try Chrome or Edge for voice conversations.
          </div>
        )}
      </div>
    );
  }

  // ── Render: Active conversation ───────────────────────────────────
  const modeConfig = mode ? CONVERSATION_MODES[mode] : null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header with timer */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-xl">{modeConfig?.icon}</span>
          <div>
            <h3 className="text-[14px] font-semibold text-[#0e393d]">{modeConfig?.label}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {/* Status indicator */}
              <div className={`w-2 h-2 rounded-full ${
                status === 'listening' ? 'bg-[#0C9C6C] animate-pulse' :
                status === 'thinking' ? 'bg-[#C4A96A] animate-pulse' :
                status === 'speaking' ? 'bg-blue-500 animate-pulse' :
                status === 'ended' ? 'bg-[#1c2a2b]/20' :
                'bg-[#1c2a2b]/30'
              }`} />
              <span className="text-[11px] text-[#1c2a2b]/40 capitalize">{status}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer */}
          <div className="text-right">
            <div className="text-[16px] font-mono font-semibold text-[#0e393d]">{formatTime(elapsed)}</div>
            <div className="text-[9px] text-[#1c2a2b]/30">of {formatTime(maxDuration)}</div>
          </div>
          {/* End button */}
          {status !== 'ended' && (
            <button
              onClick={handleEndSession}
              className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[11px] font-medium hover:bg-red-100 transition-colors"
            >
              End
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#0e393d]/[.06] rounded-full mb-6 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{
            width: `${progress * 100}%`,
            backgroundColor: progress > 0.8 ? '#E06B5B' : progress > 0.5 ? '#C4A96A' : '#0C9C6C',
          }}
        />
      </div>

      {/* Conversation transcript */}
      <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
        {turns.map((turn, i) => (
          <div
            key={i}
            className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
              turn.role === 'user'
                ? 'bg-[#0e393d] text-white rounded-br-md'
                : 'bg-[#0e393d]/[.04] text-[#0e393d] rounded-bl-md'
            }`}>
              <p className="text-[13px] leading-relaxed">{turn.text}</p>
            </div>
          </div>
        ))}

        {/* Interim transcript */}
        {interimTranscript && status === 'listening' && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-[#0e393d]/60 text-white/70 rounded-br-md">
              <p className="text-[13px] leading-relaxed italic">{interimTranscript}</p>
            </div>
          </div>
        )}

        {/* Thinking indicator */}
        {status === 'thinking' && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-2.5 bg-[#0e393d]/[.04] rounded-bl-md">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-[#0e393d]/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-[#0e393d]/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-[#0e393d]/30 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Voice controls */}
      {status !== 'ended' && (
        <div className="flex flex-col items-center gap-4">
          {/* Main mic button */}
          <button
            onClick={() => {
              if (isListening) {
                stopListening();
              } else if (status !== 'thinking' && status !== 'speaking') {
                setStatus('listening');
                startListening();
              }
            }}
            disabled={status === 'thinking' || status === 'speaking' || status === 'starting'}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
              isListening
                ? 'bg-[#E06B5B] text-white scale-110 shadow-[#E06B5B]/30'
                : status === 'thinking'
                ? 'bg-[#C4A96A]/20 text-[#C4A96A] cursor-wait'
                : status === 'speaking'
                ? 'bg-blue-100 text-blue-500 cursor-wait'
                : 'bg-[#0e393d] text-white hover:bg-[#0e393d]/90 hover:scale-105'
            }`}
          >
            {isListening ? (
              // Recording indicator
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : status === 'speaking' ? (
              // Speaker icon
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            ) : (
              // Mic icon
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            )}
          </button>

          {/* Status text */}
          <span className="text-[11px] text-[#1c2a2b]/40">
            {isListening ? 'Listening... tap to stop' :
             status === 'thinking' ? 'Thinking...' :
             status === 'speaking' ? 'Speaking...' :
             'Tap to speak'}
          </span>

          {/* Continuous listening toggle */}
          <label className="flex items-center gap-2 text-[11px] text-[#1c2a2b]/40 cursor-pointer">
            <input
              type="checkbox"
              checked={autoListening}
              onChange={e => setAutoListening(e.target.checked)}
              className="accent-[#0e393d] w-3.5 h-3.5"
            />
            Continuous listening mode
          </label>
        </div>
      )}

      {/* Ended state */}
      {status === 'ended' && (
        <div className="text-center py-8">
          <div className="text-2xl mb-2">✅</div>
          <h3 className="text-[14px] font-semibold text-[#0e393d] mb-1">Session Complete</h3>
          <p className="text-[12px] text-[#1c2a2b]/40">
            {formatTime(elapsed)} duration · {turns.length} exchanges
          </p>
          <button
            onClick={() => {
              setSessionId(null);
              setMode(null);
              setStatus('idle');
              setTurns([]);
              setElapsed(0);
              setError(null);
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-[13px] font-medium hover:bg-[#0e393d]/90 transition-all"
          >
            New Conversation
          </button>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-600">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-400 hover:text-red-600"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
