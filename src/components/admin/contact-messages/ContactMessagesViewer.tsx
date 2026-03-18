'use client';

import { useState } from 'react';

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('de-CH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ContactMessagesViewer({ messages }: { messages: ContactMessage[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = messages.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.message.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Contact Messages</h1>
          <p className="text-sm text-[#1c2a2b]/40 mt-0.5">{messages.length} total</p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, message…"
          className="w-64 rounded-xl border border-[#0e393d]/15 bg-white px-4 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/35 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded-xl border border-[#0e393d]/10 bg-white py-16 text-center text-sm text-[#1c2a2b]/40">
          {messages.length === 0 ? 'No messages yet.' : 'No messages match your search.'}
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {filtered.map((msg) => {
          const isOpen = expandedId === msg.id;
          return (
            <div
              key={msg.id}
              className={`rounded-xl border bg-white transition-all duration-200 overflow-hidden ${
                isOpen ? 'border-[#0e393d]/25 shadow-sm' : 'border-[#0e393d]/10 hover:border-[#0e393d]/20'
              }`}
            >
              {/* Row — always visible */}
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : msg.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left"
              >
                {/* Avatar */}
                <div className="shrink-0 w-9 h-9 rounded-full bg-[#0e393d]/8 flex items-center justify-center">
                  <span className="text-xs font-semibold text-[#0e393d]/60 uppercase">
                    {msg.name.charAt(0)}
                  </span>
                </div>

                {/* Name + email */}
                <div className="flex-1 min-w-0 grid sm:grid-cols-[160px_1fr] gap-x-4 gap-y-0.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0e393d] truncate">{msg.name}</p>
                    <p className="text-xs text-[#1c2a2b]/45 truncate">{msg.email}</p>
                  </div>
                  <p className="text-sm text-[#1c2a2b]/55 truncate hidden sm:block">
                    {msg.message.length > 100 ? msg.message.slice(0, 100) + '…' : msg.message}
                  </p>
                </div>

                {/* Date + chevron */}
                <div className="shrink-0 flex items-center gap-3 ml-2">
                  <span className="text-xs text-[#1c2a2b]/35 whitespace-nowrap hidden md:block">
                    {fmtDate(msg.created_at)}
                  </span>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    className={`text-[#1c2a2b]/30 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </button>

              {/* Expanded body */}
              {isOpen && (
                <div className="border-t border-[#0e393d]/8 px-5 py-5 bg-[#fafaf8]">
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mb-4 text-xs text-[#1c2a2b]/45">
                    <span>
                      <span className="font-medium text-[#1c2a2b]/60">From:</span>{' '}
                      <a href={`mailto:${msg.email}`} className="text-[#0e393d] hover:underline">{msg.email}</a>
                    </span>
                    <span>
                      <span className="font-medium text-[#1c2a2b]/60">Received:</span>{' '}
                      {fmtDate(msg.created_at)}
                    </span>
                    <span>
                      <span className="font-medium text-[#1c2a2b]/60">ID:</span>{' '}
                      <span className="font-mono">{msg.id}</span>
                    </span>
                  </div>
                  <div className="rounded-xl border border-[#0e393d]/10 bg-white px-5 py-4">
                    <p className="text-sm text-[#1c2a2b]/75 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <a
                      href={`mailto:${msg.email}?subject=Re: Your message to Evida Life`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#0e393d]/15 bg-white px-3 py-1.5 text-xs font-medium text-[#0e393d] hover:border-[#0e393d]/30 hover:bg-[#0e393d]/4 transition"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      Reply via email
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
