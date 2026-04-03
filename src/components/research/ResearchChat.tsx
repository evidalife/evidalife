'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useVoiceInput } from '@/hooks/useVoiceInput';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Citation {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  publication_year: number | null;
  doi: string | null;
  similarity: number;
  url: string;
  citation: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  isStreaming?: boolean;
}

interface FlaggedMarker {
  slug: string;
  name: string;
  value: number;
  unit: string;
  status: string;
}

interface ResearchChatProps {
  biomarkerContext?: string;
  flaggedMarkers?: FlaggedMarker[];  // From briefing AI handoff
  suggestions?: string[];
  placeholder?: string;
}

// ── Suggestion chips ──────────────────────────────────────────────────────────

const DEFAULT_SUGGESTIONS = [
  'Which dietary interventions reduce hsCRP?',
  'Does plant-based diet lower LDL cholesterol?',
  'What does research say about Vitamin D and mortality?',
  'Best evidence for reducing insulin resistance?',
  'Omega-3 dosing and cardiovascular outcomes?',
  'How does exercise affect biological age?',
];

// ── Icons ─────────────────────────────────────────────────────────────────────

function DocIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function MicIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" strokeWidth={2} strokeLinecap="round" />
      <line x1="8" y1="23" x2="16" y2="23" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

function SpeakerIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.54 8.46a5 5 0 010 7.07" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.07 4.93a10 10 0 010 14.14" />
    </svg>
  );
}

function StopIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}

// ── Citation card ─────────────────────────────────────────────────────────────

function CitationCard({ citation, index }: { citation: Citation; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const firstAuthor = citation.authors[0] ?? 'Unknown';
  const authorStr =
    citation.authors.length > 2
      ? `${firstAuthor} et al.`
      : citation.authors.length === 2
      ? `${firstAuthor} & ${citation.authors[1]}`
      : firstAuthor;

  return (
    <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden transition-shadow hover:shadow-sm">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#0e393d]/[.02] transition-colors"
      >
        <span className="mt-0.5 shrink-0 w-6 h-6 rounded-lg bg-[#0e393d] text-white text-[10px] font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[#1c2a2b] line-clamp-2 leading-snug">
            {citation.title}
          </p>
          <p className="text-[11px] text-[#1c2a2b]/45 mt-1">
            {authorStr} · {citation.journal ?? 'Unknown journal'}{citation.publication_year ? ` · ${citation.publication_year}` : ''}
          </p>
        </div>
        <svg className={`shrink-0 mt-1 w-3.5 h-3.5 text-[#1c2a2b]/25 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-[#0e393d]/6">
          <div className="flex items-center gap-3 mt-1.5">
            {citation.similarity > 0 && (
              <span className="text-[10px] font-medium text-[#1c2a2b]/35 bg-[#0e393d]/[.04] rounded-full px-2 py-0.5">
                {citation.similarity}% match
              </span>
            )}
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-[#0e393d] hover:underline"
              onClick={e => e.stopPropagation()}
            >
              View on PubMed →
            </a>
            {citation.doi && (
              <a
                href={`https://doi.org/${citation.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#1c2a2b]/35 hover:underline"
                onClick={e => e.stopPropagation()}
              >
                DOI
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Message rendering ────────────────────────────────────────────────────────

function renderMarkdownLite(text: string) {
  return text
    .split('\n')
    .map((line, i, arr) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} className="font-semibold text-[#0e393d]">{part.slice(2, -2)}</strong>;
        }
        return <span key={j}>{part}</span>;
      });
      return (
        <span key={i}>
          {parts}
          {i < arr.length - 1 && <br />}
        </span>
      );
    });
}

function AssistantMessage({ message, isSpeaking, onPlayTTS, onStopTTS }: {
  message: Message;
  isSpeaking: boolean;
  onPlayTTS: (text: string) => void;
  onStopTTS: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 max-w-full">
      {/* Answer text */}
      <div className="rounded-2xl bg-white border border-[#0e393d]/8 px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-lg bg-[#0e393d] flex items-center justify-center">
            <DocIcon className="w-3.5 h-3.5 text-[#ceab84]" />
          </div>
          <span className="text-[11px] font-semibold text-[#0e393d]/60 tracking-wide uppercase">Research Synthesis</span>
          {message.isStreaming && (
            <span className="ml-auto flex gap-0.5">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#ceab84] animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          )}
          {/* TTS play/stop button */}
          {!message.isStreaming && message.content && (
            <button
              onClick={() => isSpeaking ? onStopTTS() : onPlayTTS(message.content)}
              className="ml-auto shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[#0e393d]/40 hover:text-[#0e393d] hover:bg-[#0e393d]/5 transition-colors"
              title={isSpeaking ? 'Stop reading' : 'Read aloud'}
            >
              {isSpeaking ? <StopIcon className="w-3.5 h-3.5" /> : <SpeakerIcon className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
        <div className="text-[14px] text-[#1c2a2b] leading-[1.7] whitespace-pre-line">
          {renderMarkdownLite(message.content)}
          {message.isStreaming && <span className="inline-block w-0.5 h-4 bg-[#ceab84] ml-0.5 animate-pulse align-text-bottom" />}
        </div>

        {!message.isStreaming && message.content && (
          <p className="mt-4 pt-3 border-t border-[#0e393d]/6 text-[11px] text-[#1c2a2b]/35 leading-relaxed">
            For educational purposes only. Consult your healthcare provider for personal medical advice.
          </p>
        )}
      </div>

      {/* Citations */}
      {message.citations.length > 0 && !message.isStreaming && (
        <div>
          <p className="text-[11px] font-semibold text-[#ceab84] uppercase tracking-wider mb-2.5 px-1">
            {message.citations.length} Studies Referenced
          </p>
          <div className="grid gap-2">
            {message.citations.map((c, i) => (
              <CitationCard key={c.pmid ?? `cite-${i}`} citation={c} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ResearchChat({
  biomarkerContext,
  flaggedMarkers,
  suggestions = DEFAULT_SUGGESTIONS,
  placeholder = 'Ask a research question, e.g. "Does reducing saturated fat lower cardiovascular risk?"',
}: ResearchChatProps) {
  const locale = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [briefingHandoffDone, setBriefingHandoffDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── TTS playback state ──────────────────────────────────────────────
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceInitiatedRef = useRef(false); // whether the current query was voice-initiated

  // Pre-created Audio element to bypass autoplay restrictions.
  // Created on user gesture (mic click), reused for TTS playback later.
  const warmAudioRef = useRef<HTMLAudioElement | null>(null);

  /** Call on a user gesture (click) to unlock audio playback for later */
  const warmUpAudio = useCallback(() => {
    // Create and "play" a silent audio to unlock autoplay
    const audio = new Audio();
    // Tiny silent WAV (44 bytes)
    audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    audio.volume = 0;
    audio.play().then(() => {
      audio.pause();
      warmAudioRef.current = audio;
    }).catch(() => {
      // Gesture didn't unlock — we'll try again on playTTS
    });
  }, []);

  const stopTTS = useCallback(() => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.src = '';
      ttsAudioRef.current = null;
    }
    // Also stop browser SpeechSynthesis fallback
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMsgId(null);
  }, []);

  /** Extract a short spoken summary: just the key points */
  const extractSpokenSummary = useCallback((text: string): string => {
    // Strip markdown bold markers, citation numbers, disclaimer
    let clean = text.replace(/\*\*/g, '').replace(/\[\d+\]/g, '');
    // Remove the standard disclaimer suffix
    clean = clean.replace(/For educational purposes only[.].*/s, '').trim();
    // Collapse multiple newlines
    clean = clean.replace(/\n{2,}/g, '\n').trim();
    // Take first ~250 chars, break at sentence boundary for a quick summary
    if (clean.length > 300) {
      const truncated = clean.slice(0, 300);
      const lastSentence = truncated.search(/[.!?]\s[^.!?]*$/);
      if (lastSentence > 80) {
        clean = truncated.slice(0, lastSentence + 1);
      } else {
        clean = truncated.replace(/\s\S*$/, '') + '.';
      }
    }
    return clean;
  }, []);

  const playTTS = useCallback(async (text: string, msgId?: string) => {
    stopTTS();

    const spokenText = extractSpokenSummary(text);
    if (msgId) setSpeakingMsgId(msgId);

    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: spokenText, lang: locale, role: 'research', source: 'research' }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.warn('[ResearchChat TTS] API returned', res.status, errBody);
        throw new Error(`TTS ${res.status}`);
      }

      const ttsSource = res.headers.get('X-TTS-Source');
      console.info('[ResearchChat TTS] provider:', ttsSource);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Reuse the pre-warmed audio element if available (bypasses autoplay)
      const audio = warmAudioRef.current || new Audio();
      warmAudioRef.current = null;
      audio.volume = 1;
      audio.src = url;
      ttsAudioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        ttsAudioRef.current = null;
        setSpeakingMsgId(null);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        ttsAudioRef.current = null;
        setSpeakingMsgId(null);
      };

      await audio.play();
    } catch (err) {
      console.warn('[ResearchChat TTS] fallback to browser speech:', err);
      // Fallback to browser SpeechSynthesis
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const SPEECH_LANG: Record<string, string> = { en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', it: 'it-IT' };
        const utter = new SpeechSynthesisUtterance(spokenText);
        utter.lang = SPEECH_LANG[locale] || 'en-US';
        utter.rate = 0.95;
        utter.onend = () => setSpeakingMsgId(null);
        utter.onerror = () => setSpeakingMsgId(null);
        window.speechSynthesis.speak(utter);
      } else {
        setSpeakingMsgId(null);
      }
    }
  }, [locale, stopTTS, extractSpokenSummary]);

  // Cleanup TTS on unmount
  useEffect(() => { return () => { stopTTS(); }; }, [stopTTS]);

  // ── Voice input ─────────────────────────────────────────────────────
  const sendVoiceQuestionRef = useRef<(q: string) => void>(() => {});

  const voice = useVoiceInput({
    lang: locale,
    onResult: (transcript) => {
      voiceInitiatedRef.current = true;
      setInput('');
      sendVoiceQuestionRef.current(transcript);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Shared SSE stream handler ───────────────────────────────────────
  const streamResponse = useCallback(async (
    body: Record<string, unknown>,
    userContent: string
  ) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userContent,
      citations: [],
    };

    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      citations: [],
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    let finalContent = '';

    try {
      const res = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) throw new Error(`Request failed: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const { type, data } = JSON.parse(line.slice(6));

            if (type === 'citations') {
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, citations: data } : m)
              );
            } else if (type === 'text') {
              finalContent += data;
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: m.content + data } : m)
              );
            } else if (type === 'done') {
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, isStreaming: false } : m)
              );
              // Auto-speak if voice-initiated
              if (voiceInitiatedRef.current && finalContent) {
                voiceInitiatedRef.current = false;
                // Small delay to let React render the final state
                setTimeout(() => { playTTS(finalContent, assistantId); }, 200);
              }
            } else if (type === 'error') {
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: `Error: ${data}`, isStreaming: false } : m)
              );
            }
          } catch {
            // Skip malformed SSE chunks
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setMessages(prev =>
        prev.map(m => m.isStreaming ? { ...m, content: `Something went wrong: ${message}`, isStreaming: false } : m)
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [playTTS]);

  // Auto-trigger briefing handoff when flagged markers are provided
  useEffect(() => {
    if (flaggedMarkers && flaggedMarkers.length > 0 && !briefingHandoffDone && !isLoading) {
      setBriefingHandoffDone(true);
      const markerNames = flaggedMarkers.map(m => `${m.name} (${m.value} ${m.unit})`).join(', ');
      streamResponse(
        { flaggedMarkers, locale },
        `Research my flagged biomarkers: ${markerNames}`
      );
    }
  }, [flaggedMarkers, briefingHandoffDone, isLoading, streamResponse, locale]);

  const sendQuestion = useCallback(async (question: string) => {
    if (!question.trim() || isLoading) return;
    setInput('');
    await streamResponse(
      { question: question.trim(), biomarkerContext, locale },
      question.trim()
    );
  }, [isLoading, biomarkerContext, locale, streamResponse]);

  // Voice queries are general — don't include personal biomarker data
  const sendVoiceQuestion = useCallback(async (question: string) => {
    if (!question.trim() || isLoading) return;
    await streamResponse(
      { question: question.trim(), locale },
      question.trim()
    );
  }, [isLoading, locale, streamResponse]);

  // Refs so voice callback always has latest functions
  const sendQuestionRef = useRef(sendQuestion);
  useEffect(() => { sendQuestionRef.current = sendQuestion; }, [sendQuestion]);
  useEffect(() => { sendVoiceQuestionRef.current = sendVoiceQuestion; }, [sendVoiceQuestion]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Message area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isEmpty ? (
          /* ── Empty state ──────────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
            {/* Animated molecule illustration */}
            <div className="relative mb-8">
              <div className="w-20 h-20 rounded-3xl bg-[#0e393d] flex items-center justify-center shadow-lg shadow-[#0e393d]/20">
                <DocIcon className="w-10 h-10 text-[#ceab84]" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#ceab84] flex items-center justify-center">
                <svg className="w-3 h-3 text-[#0e393d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>

            <h2 className="font-serif text-2xl sm:text-3xl text-[#0e393d] mb-3">
              What would you like to research?
            </h2>
            <p className="text-sm text-[#1c2a2b]/45 max-w-md mb-10 leading-relaxed">
              Ask any health or nutrition question. Every answer is synthesized from peer-reviewed studies with full citations you can verify.
            </p>

            {biomarkerContext && (
              <div className="flex items-center gap-2 mb-6 bg-emerald-50 rounded-full px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-emerald-700">
                  Personalized to your biomarker data
                </span>
              </div>
            )}

            {/* Suggestion grid */}
            {suggestions.length > 0 && (
              <div className="w-full max-w-2xl">
                <p className="text-[11px] font-semibold text-[#ceab84] uppercase tracking-widest mb-4">
                  Popular questions
                </p>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => sendQuestion(s)}
                      className="text-left text-[13px] px-4 py-3 rounded-xl border border-[#0e393d]/10 bg-white text-[#1c2a2b] hover:border-[#0e393d]/30 hover:bg-[#0e393d]/[.02] hover:shadow-sm transition-all group"
                    >
                      <span className="text-[#ceab84] mr-1.5 group-hover:text-[#0e393d] transition-colors">→</span>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Messages ─────────────────────────────────────────────────── */
          <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 max-w-[800px] mx-auto">
            {messages.map(msg =>
              msg.role === 'user' ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[80%] bg-[#0e393d] text-white rounded-2xl rounded-tr-md px-5 py-3 text-[14px] leading-relaxed shadow-sm">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={msg.id}>
                  <AssistantMessage
                    message={msg}
                    isSpeaking={speakingMsgId === msg.id}
                    onPlayTTS={(text) => { warmUpAudio(); playTTS(text, msg.id); }}
                    onStopTTS={stopTTS}
                  />
                </div>
              )
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input bar ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-[#0e393d]/8 bg-white px-4 sm:px-6 py-3.5">
        <div className="max-w-[800px] mx-auto">
          {biomarkerContext && messages.length === 0 && (
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-[#1c2a2b]/35">
                Answers personalized by your biomarker data
              </span>
            </div>
          )}
          {/* Voice interim transcript indicator */}
          {voice.isListening && voice.interimTranscript && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[13px] text-[#1c2a2b]/50 italic truncate">
                {voice.interimTranscript}
              </span>
            </div>
          )}
          <div className="flex gap-2.5 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={voice.isListening ? 'Listening...' : placeholder}
              rows={1}
              disabled={isLoading || voice.isListening}
              className="flex-1 resize-none rounded-xl border border-[#0e393d]/15 bg-[#fafaf8] px-4 py-3 text-[14px] text-[#1c2a2b] placeholder-[#1c2a2b]/25 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/20 focus:border-[#0e393d]/30 transition disabled:opacity-50 max-h-32 overflow-y-auto"
              style={{ lineHeight: '1.5' }}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 128) + 'px';
              }}
            />
            {/* Mic button */}
            {voice.supported && (
              <button
                onClick={() => { warmUpAudio(); voice.toggleListening(); }}
                disabled={isLoading}
                className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition shadow-sm ${
                  voice.isListening
                    ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                    : 'bg-[#0e393d]/10 text-[#0e393d] hover:bg-[#0e393d]/20'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
                title={voice.isListening ? 'Stop listening' : 'Ask by voice'}
              >
                {voice.isListening ? <StopIcon /> : <MicIcon />}
              </button>
            )}
            <button
              onClick={() => sendQuestion(input)}
              disabled={isLoading || !input.trim()}
              className="shrink-0 w-11 h-11 rounded-xl bg-[#0e393d] text-white flex items-center justify-center hover:bg-[#0e393d]/85 transition disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading ? <SpinnerIcon /> : <SendIcon />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
