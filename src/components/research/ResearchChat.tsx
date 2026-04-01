'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

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

function AssistantMessage({ message }: { message: Message }) {
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
              <CitationCard key={c.pmid} citation={c} index={i} />
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [briefingHandoffDone, setBriefingHandoffDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Shared SSE stream handler for both question mode and briefing handoff
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

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      citations: [],
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

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
                prev.map(m => m.id === assistantMsg.id ? { ...m, citations: data } : m)
              );
            } else if (type === 'text') {
              setMessages(prev =>
                prev.map(m => m.id === assistantMsg.id ? { ...m, content: m.content + data } : m)
              );
            } else if (type === 'done') {
              setMessages(prev =>
                prev.map(m => m.id === assistantMsg.id ? { ...m, isStreaming: false } : m)
              );
            } else if (type === 'error') {
              setMessages(prev =>
                prev.map(m => m.id === assistantMsg.id ? { ...m, content: `Error: ${data}`, isStreaming: false } : m)
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
  }, []);

  // Auto-trigger briefing handoff when flagged markers are provided
  useEffect(() => {
    if (flaggedMarkers && flaggedMarkers.length > 0 && !briefingHandoffDone && !isLoading) {
      setBriefingHandoffDone(true);
      const markerNames = flaggedMarkers.map(m => `${m.name} (${m.value} ${m.unit})`).join(', ');
      streamResponse(
        { flaggedMarkers },
        `Research my flagged biomarkers: ${markerNames}`
      );
    }
  }, [flaggedMarkers, briefingHandoffDone, isLoading, streamResponse]);

  const sendQuestion = useCallback(async (question: string) => {
    if (!question.trim() || isLoading) return;
    setInput('');
    await streamResponse(
      { question: question.trim(), biomarkerContext },
      question.trim()
    );
  }, [isLoading, biomarkerContext, streamResponse]);

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
      <div className="flex-1 overflow-y-auto">
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
                  <AssistantMessage message={msg} />
                </div>
              )
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input bar ──────────────────────────────────────────────────── */}
      <div className="border-t border-[#0e393d]/8 bg-white/80 backdrop-blur-sm px-4 sm:px-6 py-3.5">
        <div className="max-w-[800px] mx-auto">
          {biomarkerContext && messages.length === 0 && (
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-[#1c2a2b]/35">
                Answers personalized by your biomarker data
              </span>
            </div>
          )}
          <div className="flex gap-2.5 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none rounded-xl border border-[#0e393d]/15 bg-[#fafaf8] px-4 py-3 text-[14px] text-[#1c2a2b] placeholder-[#1c2a2b]/25 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/20 focus:border-[#0e393d]/30 transition disabled:opacity-50 max-h-32 overflow-y-auto"
              style={{ lineHeight: '1.5' }}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 128) + 'px';
              }}
            />
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
