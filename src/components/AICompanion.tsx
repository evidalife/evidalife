'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Suggestion chips per page context
const PAGE_CHIPS: Record<string, string[]> = {
  kitchen: [
    "What should I cook for my iron levels?",
    "Best anti-inflammatory recipes?",
    "Daily Dozen meal ideas",
  ],
  'daily-dozen': [
    "Which Daily Dozen categories matter most for longevity?",
    "How do beans affect blood sugar?",
    "Best berries for inflammation?",
  ],
  bioage: [
    "How can I lower my biological age?",
    "What affects PhenoAge?",
    "Lifestyle habits that slow aging?",
  ],
  biomarkers: [
    "What does hsCRP mean?",
    "How to improve my LDL naturally?",
    "What affects homocysteine levels?",
  ],
  'health-engine': [
    "How do I improve my longevity score?",
    "What's the most impactful change I can make?",
    "Explain my domain scores",
  ],
};

function getChips(pathname: string): string[] {
  const segment = Object.keys(PAGE_CHIPS).find(k => pathname.includes(k));
  return segment ? PAGE_CHIPS[segment] : [];
}

export default function AICompanion() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const chips = getChips(pathname ?? '');

  // Detect locale from pathname for language
  const lang = (() => {
    const match = pathname?.match(/^\/(de|fr|es|it|en)\//);
    return match ? match[1] : 'en';
  })();

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamingText]);

  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamingText('');

    const allMessages = [...messages, userMsg];

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages,
          context: `Current page: ${pathname}`,
          lang,
          mode: 'coach',
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
          } catch { /* skip */ }
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: accumulated }]);
      setStreamingText('');

      if (!isOpen) setHasNewMessage(true);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '…' }]);
    } finally {
      setIsStreaming(false);
    }
  }, [messages, isStreaming, pathname, lang, isOpen]);

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
      setInput(transcript);
      setIsListening(false);
      sendMessage(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, lang, sendMessage]);

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  return (
    <>
      {/* Suggestion chips — shown when closed and on relevant pages */}
      {!isOpen && chips.length > 0 && (
        <div className="fixed bottom-24 right-5 z-40 flex flex-col items-end gap-2 pointer-events-none">
          {chips.slice(0, 2).map((chip, i) => (
            <button
              key={i}
              onClick={() => { setIsOpen(true); sendMessage(chip); }}
              className="pointer-events-auto bg-white border border-[#0e393d]/10 text-[#0e393d] text-[11px] font-medium px-3.5 py-2 rounded-full shadow-lg shadow-[#0e393d]/10 hover:bg-[#fafaf8] hover:border-[#0e393d]/20 transition-all max-w-[220px] text-left"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl shadow-[#0e393d]/15 border border-[#0e393d]/[.07] flex flex-col overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 120px)', height: 520 }}
        >
          {/* Header */}
          <div className="bg-[#0e393d] px-4 py-3.5 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#0C9C6C]/20 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0C9C6C" strokeWidth="1.5">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                <path d="M8 12h.01M12 12h.01M16 12h.01" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-[12px] font-semibold text-white">Evida Coach</div>
              <div className="text-[9px] text-white/35">WFPB · Longevity · Nutrition</div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 rounded-full bg-white/[.06] hover:bg-white/[.12] flex items-center justify-center transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-[#0e393d]/[.05] flex items-center justify-center mx-auto mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0e393d" strokeWidth="1.2" opacity="0.4">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                    <path d="M8 12h.01M12 12h.01M16 12h.01" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-[11px] text-[#1c2a2b]/40 leading-relaxed">
                  Ask me anything about nutrition, your biomarkers, or how to eat for longevity.
                </p>
                {chips.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                    {chips.map((chip, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(chip)}
                        className="text-[10px] px-2.5 py-1.5 rounded-full bg-[#0e393d]/[.05] text-[#0e393d]/60 hover:bg-[#0e393d]/[.09] hover:text-[#0e393d] transition-colors border border-[#0e393d]/[.07]"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[12px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#0e393d] text-white/85 rounded-br-sm'
                    : 'bg-[#fafaf8] text-[#1c2a2b]/80 border border-[#0e393d]/[.06] rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {streamingText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm text-[12px] leading-relaxed bg-[#fafaf8] text-[#1c2a2b]/80 border border-[#0e393d]/[.06]">
                  {streamingText}
                  <span className="inline-block w-0.5 h-3.5 bg-[#0e393d]/30 ml-0.5 animate-pulse" />
                </div>
              </div>
            )}

            {isStreaming && !streamingText && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-[#fafaf8] border border-[#0e393d]/[.06]">
                  <span className="inline-flex gap-1">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#0e393d]/25 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-3 pb-3 shrink-0 border-t border-[#0e393d]/[.05] pt-3">
            <div className="flex gap-1.5">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder="Ask about nutrition, results, or recipes…"
                disabled={isStreaming}
                className="flex-1 rounded-xl bg-[#fafaf8] border border-[#0e393d]/[.08] px-3.5 py-2.5 text-[12px] text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 outline-none focus:border-[#0e393d]/20 focus:bg-white transition-all disabled:opacity-50"
              />
              {typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) ? (
                <button
                  onClick={toggleVoice}
                  disabled={isStreaming}
                  className={`rounded-xl border p-2.5 transition-all ${
                    isListening
                      ? 'bg-red-50 border-red-200 text-red-500 animate-pulse'
                      : 'bg-[#fafaf8] border-[#0e393d]/[.08] text-[#0e393d]/30 hover:text-[#0e393d]/60 hover:border-[#0e393d]/15'
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </button>
              ) : null}
              <button
                onClick={() => sendMessage(input)}
                disabled={isStreaming || !input.trim()}
                className="rounded-xl bg-[#0e393d] hover:bg-[#0e393d]/90 disabled:opacity-30 disabled:cursor-not-allowed p-2.5 transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p className="text-[9px] text-[#1c2a2b]/20 text-center mt-2">
              Educational only · Not medical advice · Always consult your doctor
            </p>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-xl transition-all active:scale-95 ${
          isOpen
            ? 'bg-[#0e393d] hover:bg-[#0e393d]/90'
            : 'bg-[#0e393d] hover:bg-[#0e393d]/90 shadow-[#0e393d]/20'
        }`}
        aria-label="Open Evida Coach"
      >
        {isOpen ? (
          <svg className="mx-auto" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <div className="relative mx-auto w-fit">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {hasNewMessage && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#0C9C6C] border-2 border-[#0e393d]" />
            )}
          </div>
        )}
        {/* Pulse ring when closed */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-[#0e393d]/30 animate-ping opacity-30" />
        )}
      </button>
    </>
  );
}
