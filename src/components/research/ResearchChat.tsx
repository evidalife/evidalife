'use client';

import { useState, useRef, useEffect } from 'react';

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

interface ResearchChatProps {
  biomarkerContext?: string;       // e.g. "hsCRP: 3.2 mg/L (elevated), Vitamin D: 22 ng/mL (low)"
  suggestions?: string[];          // Proactive suggestion chips
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
    <div className="rounded-lg border border-[#ceab84]/30 bg-[#fafaf8] overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-[#ceab84]/10 transition-colors"
      >
        <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-[#0e393d] text-white text-[10px] font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#1c2a2b] line-clamp-2 leading-snug">
            {citation.title}
          </p>
          <p className="text-[11px] text-[#1c2a2b]/50 mt-0.5">
            {authorStr} · {citation.journal ?? 'Unknown journal'}{citation.publication_year ? ` · ${citation.publication_year}` : ''}
          </p>
        </div>
        <span className="shrink-0 mt-0.5 text-[#1c2a2b]/30 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[#ceab84]/20">
          <div className="flex items-center gap-3 mt-1">
            {citation.similarity > 0 && (
              <span className="text-[10px] text-[#1c2a2b]/40">
                {citation.similarity}% match
              </span>
            )}
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-[#0C9C6C] hover:underline"
              onClick={e => e.stopPropagation()}
            >
              View on PubMed →
            </a>
            {citation.doi && (
              <a
                href={`https://doi.org/${citation.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#1c2a2b]/40 hover:underline"
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

// ── Message bubble ────────────────────────────────────────────────────────────

function AssistantMessage({ message }: { message: Message }) {
  // Render markdown-lite: bold, line breaks
  const renderContent = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          }
          return <span key={j}>{part}</span>;
        });
        return (
          <span key={i}>
            {parts}
            {i < text.split('\n').length - 1 && <br />}
          </span>
        );
      });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Answer text */}
      <div className="rounded-xl bg-white border border-[#0e393d]/10 px-4 py-3.5 shadow-sm">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-6 h-6 rounded-full bg-[#0e393d] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-[#ceab84]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-[#0e393d] tracking-wide uppercase">Research Synthesis</span>
          {message.isStreaming && (
            <span className="ml-auto flex gap-0.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-[#0e393d]/40 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          )}
        </div>
        <p className="text-sm text-[#1c2a2b] leading-relaxed whitespace-pre-line">
          {renderContent(message.content)}
          {message.isStreaming && <span className="inline-block w-0.5 h-4 bg-[#0e393d]/60 ml-0.5 animate-pulse align-text-bottom" />}
        </p>

        {/* Disclaimer */}
        {!message.isStreaming && message.content && (
          <p className="mt-3 pt-3 border-t border-[#0e393d]/8 text-[11px] text-[#1c2a2b]/40 leading-relaxed">
            For educational purposes only. Consult your healthcare provider for personal medical advice.
          </p>
        )}
      </div>

      {/* Citations */}
      {message.citations.length > 0 && !message.isStreaming && (
        <div>
          <p className="text-[11px] font-semibold text-[#1c2a2b]/40 uppercase tracking-wider mb-2">
            {message.citations.length} Studies Referenced
          </p>
          <div className="flex flex-col gap-1.5">
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
  suggestions = DEFAULT_SUGGESTIONS,
  placeholder = 'Ask a research question, e.g. "Does reducing saturated fat lower cardiovascular risk?"',
}: ResearchChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendQuestion = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question.trim(),
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
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          biomarkerContext,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Request failed: ${res.status}`);
      }

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
                prev.map(m =>
                  m.id === assistantMsg.id ? { ...m, citations: data } : m
                )
              );
            } else if (type === 'text') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsg.id
                    ? { ...m, content: m.content + data }
                    : m
                )
              );
            } else if (type === 'done') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsg.id ? { ...m, isStreaming: false } : m
                )
              );
            } else if (type === 'error') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsg.id
                    ? { ...m, content: `Error: ${data}`, isStreaming: false }
                    : m
                )
              );
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m =>
          m.isStreaming
            ? { ...m, content: `Something went wrong: ${err.message}`, isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

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
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#0e393d] flex items-center justify-center mb-4 shadow-lg">
              <svg className="w-7 h-7 text-[#ceab84]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h2 className="font-['Playfair_Display'] text-2xl text-[#0e393d] font-semibold mb-2">
              Research Engine
            </h2>
            <p className="text-sm text-[#1c2a2b]/50 max-w-sm mb-8 leading-relaxed">
              Ask any health or nutrition question. Answers are synthesized from 500,000+ peer-reviewed studies with full citations.
            </p>

            {/* Suggestion chips */}
            {suggestions.length > 0 && (
              <div className="w-full max-w-lg">
                <p className="text-[11px] font-semibold text-[#1c2a2b]/40 uppercase tracking-wider mb-3">
                  Try asking
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => sendQuestion(s)}
                      className="text-xs px-3 py-2 rounded-full border border-[#0e393d]/20 text-[#0e393d] hover:bg-[#0e393d] hover:text-white transition-colors text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5 px-4 py-4 max-w-[800px] mx-auto">
            {messages.map(msg =>
              msg.role === 'user' ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[75%] bg-[#0e393d] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
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

      {/* Input area */}
      <div className="border-t border-[#0e393d]/10 bg-white px-4 py-3">
        <div className="max-w-[800px] mx-auto">
          {biomarkerContext && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0C9C6C]" />
              <span className="text-[11px] text-[#1c2a2b]/40">
                Personalized by your biomarker data
              </span>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none rounded-xl border border-[#0e393d]/20 bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1c2a2b] placeholder-[#1c2a2b]/30 focus:outline-none focus:border-[#0e393d]/50 transition-colors disabled:opacity-50 max-h-32 overflow-y-auto"
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
              className="shrink-0 w-10 h-10 rounded-xl bg-[#0e393d] text-white flex items-center justify-center hover:bg-[#0e393d]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
