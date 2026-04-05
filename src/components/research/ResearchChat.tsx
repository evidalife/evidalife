'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useVoiceInput } from '@/hooks/useVoiceInput';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Citation {
  pmid: string | null;
  title: string;
  authors: string[];
  journal: string;
  publication_year: number | null;
  doi: string | null;
  similarity: number;
  url: string | null;
  citation: string;
  is_book_chunk?: boolean;
  is_nf_content?: boolean;
  content_type?: string; // 'video' | 'blog' | 'question'
}

const BOOK_URLS: Record<string, string> = {
  'How Not to Age': 'https://nutritionfacts.org/book/how-not-to-age/',
  'How Not to Die': 'https://nutritionfacts.org/book/how-not-to-die/',
  'How Not to Diet': 'https://nutritionfacts.org/book/how-not-to-diet/',
  'Lower LDL Cholesterol Naturally with Food': 'https://nutritionfacts.org/book/portfolio/',
  'Ultra-Processed Foods': 'https://nutritionfacts.org/book/ultra-processed/',
  'Ozempic': 'https://nutritionfacts.org/book/ozempic/',
};

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

// ── i18n ─────────────────────────────────────────────────────────────────────

type Lang = 'en' | 'de' | 'fr' | 'es' | 'it';

const I18N: Record<Lang, {
  heading: string;
  subtitle: string;
  personalized: string;
  personalizedShort: string;
  popularLabel: string;
  placeholder: string;
  listening: string;
  stopListening: string;
  askByVoice: string;
  stopSpeaking: string;
  welcomeGreeting: string;
  suggestions: string[];
}> = {
  en: {
    heading: 'What would you like to research?',
    subtitle: 'Ask any health or nutrition question. Every answer is synthesized from peer-reviewed studies with full citations you can verify.',
    personalized: 'Personalized to your biomarker data',
    personalizedShort: 'Answers personalized by your biomarker data',
    popularLabel: 'Popular questions',
    placeholder: 'Ask a research question, e.g. "Does reducing saturated fat lower cardiovascular risk?"',
    listening: 'Listening...',
    stopListening: 'Stop listening',
    askByVoice: 'Ask by voice',
    stopSpeaking: 'Stop speaking',
    welcomeGreeting: 'Welcome to Evida Research. You have the full voice experience. Click the microphone and ask me anything by voice — I will answer you both spoken and written. Or simply type your question below.',
    suggestions: [
      'Which dietary interventions reduce hsCRP?',
      'Does plant-based diet lower LDL cholesterol?',
      'What does research say about Vitamin D and mortality?',
      'Best evidence for reducing insulin resistance?',
      'Omega-3 dosing and cardiovascular outcomes?',
      'How does exercise affect biological age?',
    ],
  },
  de: {
    heading: 'Was möchtest du erforschen?',
    subtitle: 'Stelle jede Gesundheits- oder Ernährungsfrage. Jede Antwort wird aus begutachteten Studien mit vollständigen Quellenangaben zusammengefasst.',
    personalized: 'Personalisiert anhand deiner Biomarker-Daten',
    personalizedShort: 'Antworten personalisiert durch deine Biomarker-Daten',
    popularLabel: 'Beliebte Fragen',
    placeholder: 'Stelle eine Forschungsfrage, z. B. „Senkt eine Reduktion gesättigter Fette das Herz-Kreislauf-Risiko?"',
    listening: 'Hört zu...',
    stopListening: 'Aufnahme stoppen',
    askByVoice: 'Per Stimme fragen',
    stopSpeaking: 'Vorlesen stoppen',
    welcomeGreeting: 'Willkommen bei Evida Research. Du hast das volle Spracherlebnis. Klicke auf das Mikrofon und stelle mir eine Frage per Stimme — ich antworte dir gesprochen und geschrieben. Oder tippe einfach deine Frage unten ein.',
    suggestions: [
      'Welche Ernährungsmaßnahmen senken hsCRP?',
      'Senkt eine pflanzliche Ernährung das LDL-Cholesterin?',
      'Was sagt die Forschung zu Vitamin D und Sterblichkeit?',
      'Beste Evidenz zur Senkung der Insulinresistenz?',
      'Omega-3-Dosierung und kardiovaskuläre Ergebnisse?',
      'Wie beeinflusst Bewegung das biologische Alter?',
    ],
  },
  fr: {
    heading: 'Que souhaitez-vous rechercher ?',
    subtitle: 'Posez n\'importe quelle question sur la santé ou la nutrition. Chaque réponse est synthétisée à partir d\'études évaluées par des pairs avec des citations complètes.',
    personalized: 'Personnalisé selon vos données de biomarqueurs',
    personalizedShort: 'Réponses personnalisées selon vos biomarqueurs',
    popularLabel: 'Questions populaires',
    placeholder: 'Posez une question de recherche, par ex. « La réduction des graisses saturées diminue-t-elle le risque cardiovasculaire ? »',
    listening: 'Écoute en cours...',
    stopListening: 'Arrêter l\'écoute',
    askByVoice: 'Poser par la voix',
    stopSpeaking: 'Arrêter la lecture',
    welcomeGreeting: 'Bienvenue sur Evida Research. Vous disposez de l\'expérience vocale complète. Cliquez sur le microphone et posez-moi n\'importe quelle question par la voix — je vous répondrai à l\'oral et à l\'écrit. Ou tapez simplement votre question ci-dessous.',
    suggestions: [
      'Quelles interventions diététiques réduisent la hsCRP ?',
      'Le régime végétal réduit-il le cholestérol LDL ?',
      'Que dit la recherche sur la vitamine D et la mortalité ?',
      'Meilleures preuves pour réduire la résistance à l\'insuline ?',
      'Dosage d\'oméga-3 et résultats cardiovasculaires ?',
      'Comment l\'exercice affecte-t-il l\'âge biologique ?',
    ],
  },
  es: {
    heading: '¿Qué te gustaría investigar?',
    subtitle: 'Haz cualquier pregunta sobre salud o nutrición. Cada respuesta se sintetiza a partir de estudios revisados por pares con citas completas.',
    personalized: 'Personalizado según tus datos de biomarcadores',
    personalizedShort: 'Respuestas personalizadas con tus datos de biomarcadores',
    popularLabel: 'Preguntas populares',
    placeholder: 'Haz una pregunta de investigación, p. ej. "¿Reducir las grasas saturadas disminuye el riesgo cardiovascular?"',
    listening: 'Escuchando...',
    stopListening: 'Dejar de escuchar',
    askByVoice: 'Preguntar por voz',
    stopSpeaking: 'Detener lectura',
    welcomeGreeting: 'Bienvenido a Evida Research. Tienes la experiencia de voz completa. Haz clic en el micrófono y pregúntame lo que quieras por voz — te responderé hablando y por escrito. O simplemente escribe tu pregunta abajo.',
    suggestions: [
      '¿Qué intervenciones dietéticas reducen la hsCRP?',
      '¿La dieta basada en plantas reduce el colesterol LDL?',
      '¿Qué dice la investigación sobre la vitamina D y la mortalidad?',
      '¿Mejor evidencia para reducir la resistencia a la insulina?',
      '¿Dosis de omega-3 y resultados cardiovasculares?',
      '¿Cómo afecta el ejercicio a la edad biológica?',
    ],
  },
  it: {
    heading: 'Cosa vorresti ricercare?',
    subtitle: 'Fai qualsiasi domanda su salute o nutrizione. Ogni risposta è sintetizzata da studi sottoposti a revisione paritaria con citazioni complete.',
    personalized: 'Personalizzato in base ai tuoi dati sui biomarcatori',
    personalizedShort: 'Risposte personalizzate in base ai tuoi biomarcatori',
    popularLabel: 'Domande popolari',
    placeholder: 'Fai una domanda di ricerca, es. "La riduzione dei grassi saturi abbassa il rischio cardiovascolare?"',
    listening: 'In ascolto...',
    stopListening: 'Interrompi ascolto',
    askByVoice: 'Chiedi a voce',
    stopSpeaking: 'Ferma lettura',
    welcomeGreeting: 'Benvenuto su Evida Research. Hai l\'esperienza vocale completa. Clicca sul microfono e chiedimi qualsiasi cosa a voce — ti risponderò parlando e per iscritto. Oppure scrivi semplicemente la tua domanda qui sotto.',
    suggestions: [
      'Quali interventi dietetici riducono la hsCRP?',
      'La dieta vegetale riduce il colesterolo LDL?',
      'Cosa dice la ricerca sulla vitamina D e la mortalità?',
      'Migliori evidenze per ridurre la resistenza all\'insulina?',
      'Dosaggio di omega-3 e risultati cardiovascolari?',
      'Come influisce l\'esercizio sull\'età biologica?',
    ],
  },
};

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
        <span className={`mt-0.5 shrink-0 w-6 h-6 rounded-lg text-white text-[10px] font-bold flex items-center justify-center ${
          citation.is_book_chunk ? 'bg-[#ceab84]' : citation.is_nf_content ? 'bg-[#4a8b3f]' : 'bg-[#0e393d]'
        }`}>
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
            {citation.is_book_chunk ? (
              <>
                {/* Link to NutritionFacts.org book page */}
                {(() => {
                  const bookUrl = Object.entries(BOOK_URLS).find(([title]) => citation.journal?.includes(title))?.[1];
                  return bookUrl ? (
                    <a
                      href={bookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-[#0e393d] hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      View Book →
                    </a>
                  ) : null;
                })()}
                <span className="text-[10px] font-medium text-[#ceab84] bg-[#ceab84]/10 rounded-full px-2 py-0.5">
                  Book Content
                </span>
              </>
            ) : citation.is_nf_content ? (
              <>
                {citation.url && (
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-[#4a8b3f] hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    View on NutritionFacts.org →
                  </a>
                )}
                <span className="text-[10px] font-medium text-[#4a8b3f] bg-[#4a8b3f]/10 rounded-full px-2 py-0.5">
                  {citation.content_type === 'video' ? 'Video' : citation.content_type === 'blog' ? 'Blog' : 'Q&A'}
                </span>
              </>
            ) : (
              <>
                {citation.url && (
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-[#0e393d] hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    View on PubMed →
                  </a>
                )}
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
              </>
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
  suggestions,
  placeholder,
}: ResearchChatProps) {
  const locale = useLocale();
  const lang = (['en','de','fr','es','it'] as Lang[]).includes(locale as Lang) ? (locale as Lang) : 'en';
  const t = I18N[lang];
  const activeSuggestions = suggestions ?? t.suggestions;
  const activePlaceholder = placeholder ?? t.placeholder;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [briefingHandoffDone, setBriefingHandoffDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── TTS playback state ──────────────────────────────────────────────
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceInitiatedRef = useRef(false); // whether the current query was voice-initiated

  // Pre-created Audio element to bypass autoplay restrictions.
  // Created on user gesture (mic click), reused for TTS playback later.
  const warmAudioRef = useRef<HTMLAudioElement | null>(null);

  // ── Streaming TTS engine ───────────────────────────────────────────
  // Buffers streamed text, detects sentence boundaries, fires parallel
  // TTS requests per chunk, and queues audio for gapless playback.
  const streamTTSRef = useRef<{
    buffer: string;           // text accumulator waiting for sentence boundary
    audioQueue: string[];     // object URLs of audio blobs ready to play
    pendingFetches: number;   // how many TTS fetches are in-flight
    isPlaying: boolean;       // is an audio element currently playing
    stopped: boolean;         // user hit stop or component unmounted
    msgId: string | null;     // which message is being spoken
  } | null>(null);

  /** Clean text for speaking: strip citations, markdown, references, disclaimers.
   *  Everything the user sees in the chat (citations, links, studies) stays visible
   *  but is NOT read aloud — only the conversational answer content is spoken. */
  const cleanForSpeech = useCallback((text: string): string => {
    let clean = text;
    // Strip markdown bold/italic markers
    clean = clean.replace(/\*{1,3}/g, '');
    // Strip inline citation numbers like [1], [2,3], [1-3]
    clean = clean.replace(/\[\d+(?:[,\-–]\d+)*\]/g, '');
    // Strip markdown links — keep display text, drop URL: [text](url) → text
    clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // Remove horizontal rules
    clean = clean.replace(/^-{3,}$/gm, '');
    // Remove disclaimer/educational warning (various phrasings)
    clean = clean.replace(/(?:This is educational|For educational purposes|This information is for educational)[\s\S]*$/i, '').trim();
    // Remove "Sources:", "References:", "Citations:" section and everything after
    clean = clean.replace(/\n(?:Sources|References|Citations|Studies cited):?\s*[\n:][\s\S]*$/i, '').trim();
    // Remove numbered reference lists like "1. Author et al. (2024)..."
    clean = clean.replace(/\n\d+\.\s+[A-Z][^.]*et al\.[\s\S]*$/i, '').trim();
    // Collapse multiple newlines into a pause
    clean = clean.replace(/\n{2,}/g, '. ').trim();
    // Collapse remaining single newlines
    clean = clean.replace(/\n/g, ' ').trim();
    // Clean up double periods, extra spaces
    clean = clean.replace(/\.\s*\./g, '.').replace(/ {2,}/g, ' ');
    // Remove trailing incomplete sentence fragments (no period at end)
    // clean = clean.replace(/[^.!?]+$/, '').trim(); // disabled — let flush handle it
    return clean;
  }, []);

  /** Call on a user gesture (click) to unlock audio playback for later */
  const warmUpAudio = useCallback(() => {
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    audio.volume = 0;
    audio.play().then(() => {
      audio.pause();
      warmAudioRef.current = audio;
    }).catch(() => {});
  }, []);

  /** Play next audio in the queue, chaining until empty */
  const playNextInQueue = useCallback(() => {
    const st = streamTTSRef.current;
    if (!st || st.stopped) return;
    if (st.audioQueue.length === 0) {
      st.isPlaying = false;
      // If no more fetches pending and queue empty → done speaking
      if (st.pendingFetches === 0) {
        setSpeakingMsgId(null);
        streamTTSRef.current = null;
      }
      return;
    }

    st.isPlaying = true;
    const url = st.audioQueue.shift()!;
    const audio = warmAudioRef.current || new Audio();
    warmAudioRef.current = null;
    audio.volume = 1;
    audio.src = url;
    ttsAudioRef.current = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      ttsAudioRef.current = null;
      playNextInQueue();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      ttsAudioRef.current = null;
      playNextInQueue();
    };

    audio.play().catch(() => {
      // Autoplay blocked — try browser speech fallback for remaining text
      URL.revokeObjectURL(url);
      ttsAudioRef.current = null;
      st.isPlaying = false;
    });
  }, []);

  /** Fire a TTS request for a text chunk and add result to audio queue */
  const fetchChunkAudio = useCallback(async (text: string) => {
    const st = streamTTSRef.current;
    if (!st || st.stopped) return;

    st.pendingFetches++;
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang: locale, role: 'research', source: 'research' }),
      });

      if (!res.ok) throw new Error(`TTS ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (st.stopped) { URL.revokeObjectURL(url); return; }

      st.audioQueue.push(url);
      // If nothing is playing yet, start playback
      if (!st.isPlaying) {
        playNextInQueue();
      }
    } catch (err) {
      console.warn('[StreamingTTS] chunk fetch failed:', err);
    } finally {
      if (st) st.pendingFetches--;
      // Check if everything is done
      if (st && st.pendingFetches === 0 && st.audioQueue.length === 0 && !st.isPlaying) {
        setSpeakingMsgId(null);
        streamTTSRef.current = null;
      }
    }
  }, [locale, playNextInQueue]);

  /** Start a streaming TTS session for a message */
  const startStreamingTTS = useCallback((msgId: string) => {
    // Stop any existing TTS
    if (streamTTSRef.current) {
      streamTTSRef.current.stopped = true;
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.src = '';
      ttsAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    streamTTSRef.current = {
      buffer: '',
      audioQueue: [],
      pendingFetches: 0,
      isPlaying: false,
      stopped: false,
      msgId,
    };
    setSpeakingMsgId(msgId);
  }, []);

  /** Feed a text chunk into the streaming TTS buffer.
   *  Groups 2-3 sentences together for natural-sounding TTS chunks,
   *  then fires each chunk to the TTS API. */
  const feedStreamingTTS = useCallback((chunk: string) => {
    const st = streamTTSRef.current;
    if (!st || st.stopped) return;

    st.buffer += chunk;

    // Strategy: accumulate raw text, then look for good split points.
    // We want chunks of ~150-400 chars (2-3 sentences) for natural TTS pacing.
    // Split at sentence boundaries (. ! ?) followed by a space.

    // Find ALL sentence-end positions in the buffer
    const sentenceEndPattern = /[.!?](?:\s|$)/g;
    let lastGoodSplit = -1;
    let m: RegExpExecArray | null;

    while ((m = sentenceEndPattern.exec(st.buffer)) !== null) {
      const pos = m.index + 1; // position right after the punctuation
      // Only consider as a split point if we have enough text
      if (pos >= 100) {
        lastGoodSplit = pos;
        // If chunk is getting long enough (>250 chars), split here
        if (pos >= 250) break;
      }
    }

    if (lastGoodSplit > 0) {
      const rawChunk = st.buffer.slice(0, lastGoodSplit);
      st.buffer = st.buffer.slice(lastGoodSplit).trimStart();

      const cleaned = cleanForSpeech(rawChunk);
      if (cleaned.length > 20) {
        fetchChunkAudio(cleaned);
      }
    }

    // Safety valve: if buffer grows very large without a sentence break, flush it
    if (st.buffer.length > 600) {
      const cleaned = cleanForSpeech(st.buffer);
      st.buffer = '';
      if (cleaned.length > 20) {
        fetchChunkAudio(cleaned);
      }
    }
  }, [cleanForSpeech, fetchChunkAudio]);

  /** Flush any remaining text in the buffer as a final TTS chunk */
  const flushStreamingTTS = useCallback(() => {
    const st = streamTTSRef.current;
    if (!st || st.stopped) return;

    const remaining = cleanForSpeech(st.buffer).trim();
    st.buffer = '';

    if (remaining.length > 10) {
      fetchChunkAudio(remaining);
    } else if (st.pendingFetches === 0 && st.audioQueue.length === 0 && !st.isPlaying) {
      // Nothing left to speak
      setSpeakingMsgId(null);
      streamTTSRef.current = null;
    }
  }, [cleanForSpeech, fetchChunkAudio]);

  const stopTTS = useCallback(() => {
    // Stop streaming TTS
    if (streamTTSRef.current) {
      streamTTSRef.current.stopped = true;
      // Revoke any queued audio URLs
      for (const url of streamTTSRef.current.audioQueue) {
        URL.revokeObjectURL(url);
      }
      streamTTSRef.current = null;
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.src = '';
      ttsAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMsgId(null);
  }, []);

  /** Stop everything: abort SSE stream + stop all TTS */
  const stopAll = useCallback(() => {
    // Abort the SSE fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Stop all TTS
    stopTTS();
    // Reset voice-initiated flag
    voiceInitiatedRef.current = false;
  }, [stopTTS]);

  /** Play TTS for a completed message (manual speaker button).
   *  Sends the full cleaned text in one request. */
  const playTTS = useCallback(async (text: string, msgId?: string) => {
    stopTTS();

    const spokenText = cleanForSpeech(text);
    if (!spokenText || spokenText.length < 10) return;
    if (msgId) setSpeakingMsgId(msgId);

    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: spokenText, lang: locale, role: 'research', source: 'research' }),
      });

      if (!res.ok) throw new Error(`TTS ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

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
  }, [locale, stopTTS, cleanForSpeech]);

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

  // ── Welcome greeting: play pre-generated audio from Voice Briefings ─
  const greetingPlayedRef = useRef(false);
  const [greetingAudioUrl, setGreetingAudioUrl] = useState<string | null>(null);
  const [greetingText, setGreetingText] = useState<string | null>(null);

  // Fetch greeting from voice-briefings API on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchGreeting() {
      try {
        const res = await fetch(`/api/voice-briefings?page=research`);
        if (!res.ok) return;
        const data = await res.json();
        const briefings = data.briefings ?? data ?? [];
        // Find the first active research briefing
        const greeting = Array.isArray(briefings) ? briefings[0] : null;
        if (!greeting || cancelled) return;

        const audioKey = `audio_url_${lang}` as keyof typeof greeting;
        const scriptKey = `script_${lang}` as keyof typeof greeting;
        const audioUrl = greeting[audioKey] as string | null;
        const script = greeting[scriptKey] as string | null;

        if (!cancelled) {
          if (audioUrl) setGreetingAudioUrl(audioUrl);
          if (script) setGreetingText(script);
        }
      } catch { /* silent */ }
    }
    fetchGreeting();
    return () => { cancelled = true; };
  }, [lang]);

  // Auto-play greeting audio once when available
  useEffect(() => {
    if (!greetingAudioUrl || greetingPlayedRef.current || messages.length > 0) return;
    const timer = setTimeout(() => {
      if (greetingPlayedRef.current) return;
      greetingPlayedRef.current = true;
      setSpeakingMsgId('__greeting__');

      const audio = warmAudioRef.current || new Audio();
      warmAudioRef.current = null;
      audio.volume = 1;
      audio.src = greetingAudioUrl;
      ttsAudioRef.current = audio;

      audio.onended = () => {
        ttsAudioRef.current = null;
        setSpeakingMsgId(null);
      };
      audio.onerror = () => {
        ttsAudioRef.current = null;
        setSpeakingMsgId(null);
      };

      audio.play().catch(() => {
        // Autoplay blocked — user will see the text and can click play
        ttsAudioRef.current = null;
        setSpeakingMsgId(null);
      });
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greetingAudioUrl]);

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

    // Start streaming TTS session if this query was voice-initiated
    if (voiceInitiatedRef.current) {
      startStreamingTTS(assistantId);
    }

    let finalContent = '';

    // Create AbortController so we can cancel the stream
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortController.signal,
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
              // Feed text chunk into streaming TTS (if voice-initiated)
              if (voiceInitiatedRef.current && streamTTSRef.current) {
                feedStreamingTTS(data);
              }
            } else if (type === 'done') {
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, isStreaming: false } : m)
              );
              // Flush remaining TTS buffer
              if (voiceInitiatedRef.current) {
                voiceInitiatedRef.current = false;
                flushStreamingTTS();
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
      // Don't show error for user-initiated abort
      if (err instanceof DOMException && err.name === 'AbortError') {
        setMessages(prev =>
          prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m)
        );
      } else {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setMessages(prev =>
          prev.map(m => m.isStreaming ? { ...m, content: `Something went wrong: ${message}`, isStreaming: false } : m)
        );
      }
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [startStreamingTTS, feedStreamingTTS, flushStreamingTTS]);

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
              {t.heading}
            </h2>
            <p className="text-sm text-[#1c2a2b]/45 max-w-md mb-6 leading-relaxed">
              {t.subtitle}
            </p>

            {/* Voice welcome banner */}
            {voice.supported && (greetingText || t.welcomeGreeting) && (
              <div className="flex items-start gap-3 mb-8 max-w-md text-left bg-[#0e393d]/[.03] border border-[#0e393d]/[.08] rounded-xl px-4 py-3">
                <button
                  onClick={() => {
                    if (speakingMsgId === '__greeting__') {
                      stopTTS();
                    } else if (greetingAudioUrl) {
                      // Play from pre-generated audio
                      stopTTS();
                      setSpeakingMsgId('__greeting__');
                      const audio = new Audio(greetingAudioUrl);
                      audio.volume = 1;
                      ttsAudioRef.current = audio;
                      audio.onended = () => { ttsAudioRef.current = null; setSpeakingMsgId(null); };
                      audio.onerror = () => { ttsAudioRef.current = null; setSpeakingMsgId(null); };
                      audio.play().catch(() => { setSpeakingMsgId(null); });
                    } else {
                      // Fallback: generate via TTS API
                      playTTS(greetingText || t.welcomeGreeting, '__greeting__');
                    }
                  }}
                  className="shrink-0 w-8 h-8 rounded-lg bg-[#0e393d] flex items-center justify-center mt-0.5 hover:bg-[#0e393d]/80 transition"
                  title={speakingMsgId === '__greeting__' ? t.stopSpeaking : (locale === 'de' ? 'Abspielen' : 'Play')}
                >
                  {speakingMsgId === '__greeting__' ? (
                    <StopIcon className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <SpeakerIcon className="w-4 h-4 text-[#ceab84]" />
                  )}
                </button>
                <div>
                  <p className="text-[13px] text-[#0e393d] leading-relaxed">
                    {greetingText || t.welcomeGreeting}
                  </p>
                </div>
              </div>
            )}

            {biomarkerContext && (
              <div className="flex items-center gap-2 mb-6 bg-emerald-50 rounded-full px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-emerald-700">
                  {t.personalized}
                </span>
              </div>
            )}

            {/* Suggestion grid */}
            {activeSuggestions.length > 0 && (
              <div className="w-full max-w-2xl">
                <p className="text-[11px] font-semibold text-[#ceab84] uppercase tracking-widest mb-4">
                  {t.popularLabel}
                </p>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {activeSuggestions.map(s => (
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
                {t.personalizedShort}
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
          {/* Stop button — visible while AI is generating or speaking */}
          {(speakingMsgId || isLoading) && (
            <button
              onClick={stopAll}
              className="flex items-center gap-2 mb-2.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[12px] font-medium hover:bg-red-100 transition-colors"
            >
              <StopIcon className="w-3.5 h-3.5" />
              <span>
                {isLoading && speakingMsgId
                  ? (locale === 'de' ? 'Antwort & Stimme stoppen' : 'Stop answer & voice')
                  : isLoading
                    ? (locale === 'de' ? 'Antwort stoppen' : 'Stop generating')
                    : t.stopSpeaking}
              </span>
              <span className="ml-auto flex gap-0.5">
                <span className="w-1 h-3 bg-red-400 rounded-full animate-pulse" />
                <span className="w-1 h-4 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                <span className="w-1 h-2.5 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
              </span>
            </button>
          )}
          <div className="flex gap-2.5 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={voice.isListening ? t.listening : activePlaceholder}
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
                title={voice.isListening ? t.stopListening : t.askByVoice}
              >
                {voice.isListening ? <StopIcon /> : <MicIcon />}
              </button>
            )}
            {isLoading ? (
              <button
                onClick={stopAll}
                className="shrink-0 w-11 h-11 rounded-xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition shadow-sm"
                title={locale === 'de' ? 'Stoppen' : 'Stop'}
              >
                <StopIcon />
              </button>
            ) : (
              <button
                onClick={() => sendQuestion(input)}
                disabled={!input.trim()}
                className="shrink-0 w-11 h-11 rounded-xl bg-[#0e393d] text-white flex items-center justify-center hover:bg-[#0e393d]/85 transition disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                <SendIcon />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
