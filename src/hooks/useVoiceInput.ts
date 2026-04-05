'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ── Medical term corrections for common STT misrecognitions ────────────────
// Web Speech API often misrecognises medical/biomarker terms.
const MEDICAL_CORRECTIONS: [RegExp, string][] = [
  [/\bapril\b/gi, 'Apo B'],
  [/\bapo\s*be\b/gi, 'Apo B'],
  [/\bapob\b/gi, 'Apo B'],
  [/\bhba1c\b/gi, 'HbA1c'],
  [/\bh\s*b\s*a\s*1\s*c\b/gi, 'HbA1c'],
  [/\bhemoglobin a1c\b/gi, 'HbA1c'],
  [/\bh\s*s\s*crp\b/gi, 'hsCRP'],
  [/\bhigh sensitivity c-reactive protein\b/gi, 'hsCRP'],
  [/\bhs crp\b/gi, 'hsCRP'],
  [/\bldl\b/gi, 'LDL'],
  [/\bhdl\b/gi, 'HDL'],
  [/\btsh\b/gi, 'TSH'],
  [/\bvitamin d\b/gi, 'Vitamin D'],
  [/\bomega 3\b/gi, 'Omega-3'],
  [/\bomega three\b/gi, 'Omega-3'],
  [/\bfenno age\b/gi, 'PhenoAge'],
  [/\bpheno age\b/gi, 'PhenoAge'],
  [/\bgrim age\b/gi, 'GrimAge'],
  [/\bduneddin pace\b/gi, 'DunedinPACE'],
  [/\bdune?din\s*pace\b/gi, 'DunedinPACE'],
  [/\btriglycerides?\b/gi, 'triglycerides'],
  [/\binsulin resistance\b/gi, 'insulin resistance'],
  [/\bferritin\b/gi, 'ferritin'],
  [/\bhomocysteine\b/gi, 'homocysteine'],
  [/\blp little a\b/gi, 'Lp(a)'],
  [/\blipoprotein a\b/gi, 'Lp(a)'],
];

function correctMedicalTerms(text: string): string {
  let corrected = text;
  for (const [pattern, replacement] of MEDICAL_CORRECTIONS) {
    corrected = corrected.replace(pattern, replacement);
  }
  return corrected;
}

export type STTMode = 'web_speech_api' | 'deepgram';

export interface UseVoiceInputOptions {
  /** BCP-47 language code, e.g. 'en-US', 'de-DE' */
  lang?: string;
  /** Called with the final transcript when speech recognition ends */
  onResult?: (transcript: string) => void;
  /** Called when an error occurs */
  onError?: (error: string) => void;
  /** Override STT provider (if not set, auto-detected from admin settings) */
  sttProvider?: STTMode;
  /**
   * If true, keeps listening until manually stopped (for conversations).
   * If false (default), auto-stops after the user pauses speaking (for single questions).
   * For Deepgram, auto-stop uses a silence timer.
   */
  continuous?: boolean;
}

export interface UseVoiceInputReturn {
  /** Whether voice input is available (either Web Speech or Deepgram) */
  supported: boolean;
  /** Whether the mic is currently listening */
  isListening: boolean;
  /** Interim (in-progress) transcript while the user is speaking */
  interimTranscript: string;
  /** Start listening */
  startListening: () => void;
  /** Stop listening */
  stopListening: () => void;
  /** Toggle listening on/off */
  toggleListening: () => void;
  /** Active STT provider */
  activeProvider: STTMode;
}

// Map our Lang codes to BCP-47
const LANG_MAP: Record<string, string> = {
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
};

/**
 * Hook for voice input supporting both Web Speech API and Deepgram.
 *
 * On mount, fetches the admin-configured STT provider. If Deepgram is selected,
 * uses MediaRecorder to capture audio and sends it to /api/ai/speech-to-text.
 * Otherwise falls back to the browser's Web Speech API.
 */
export function useVoiceInput({
  lang = 'en',
  onResult,
  onError,
  sttProvider: overrideProvider,
  continuous = false,
}: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const [supported, setSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  // Silence timer for auto-stop in Deepgram non-continuous mode
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeProvider, setActiveProvider] = useState<STTMode>('web_speech_api');

  // Web Speech API refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Deepgram refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  // Keep callback refs current without causing re-renders
  onResultRef.current = onResult;
  onErrorRef.current = onError;

  // ── Fetch STT config on mount ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function detectProvider() {
      // If override is set, use it directly
      if (overrideProvider) {
        setActiveProvider(overrideProvider);
        setSupported(true);
        return;
      }

      // Check Web Speech API support first (as fallback)
      const hasSR = typeof window !== 'undefined' &&
        !!(window.SpeechRecognition || window.webkitSpeechRecognition);

      try {
        const res = await fetch('/api/ai/speech-to-text');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            if (data.sttProvider === 'deepgram' && data.deepgramAvailable) {
              setActiveProvider('deepgram');
              setSupported(true); // Deepgram works on all browsers
            } else {
              setActiveProvider('web_speech_api');
              setSupported(hasSR);
            }
          }
        } else {
          if (!cancelled) {
            setActiveProvider('web_speech_api');
            setSupported(hasSR);
          }
        }
      } catch {
        if (!cancelled) {
          setActiveProvider('web_speech_api');
          setSupported(hasSR);
        }
      }
    }

    detectProvider();
    return () => { cancelled = true; };
  }, [overrideProvider]);

  // ── Cleanup on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      if (webSpeechSilenceRef.current) { clearTimeout(webSpeechSilenceRef.current); webSpeechSilenceRef.current = null; }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // ── Deepgram: capture audio via MediaRecorder → send to server ────
  const startDeepgram = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      // Find supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
            ? 'audio/ogg;codecs=opus'
            : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);

          // In non-continuous mode, reset silence timer on each chunk
          // Auto-stop after 2s of silence (small chunks = ambient noise only)
          if (!continuous) {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
              }
            }, 2000);
          }
        }
      };

      recorder.onstop = async () => {
        // Clear silence timer
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        // Stop mic stream
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        setIsListening(false);
        setInterimTranscript('');

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 100) {
          // Too small — no speech detected
          return;
        }

        // Show "Transcribing..." while waiting for server
        setInterimTranscript('...');

        try {
          // Convert blob to base64
          const arrayBuffer = await audioBlob.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );

          const res = await fetch('/api/ai/speech-to-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64,
              lang,
              mimeType,
            }),
          });

          setInterimTranscript('');

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            onErrorRef.current?.(`Deepgram error: ${errData.error || res.statusText}`);
            return;
          }

          const data = await res.json();
          const text = correctMedicalTerms((data.transcript || '').trim());
          if (text) {
            onResultRef.current?.(text);
          }
        } catch (err) {
          setInterimTranscript('');
          onErrorRef.current?.(`Transcription failed: ${err}`);
        }
      };

      recorder.onerror = () => {
        setIsListening(false);
        setInterimTranscript('');
        onErrorRef.current?.('MediaRecorder error');
      };

      recorder.start(250); // Collect in 250ms chunks
      setIsListening(true);
      setInterimTranscript('');
    } catch (err) {
      onErrorRef.current?.(`Microphone access denied: ${err}`);
    }
  }, [lang, continuous]);

  const stopDeepgram = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop(); // triggers onstop → sends to server
    }
  }, []);

  // ── Web Speech API: browser-native STT ────────────────────────────
  // Silence timer for Web Speech auto-stop (supplements browser's own detection)
  const webSpeechSilenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpeechActivityRef = useRef<number>(0);

  const startWebSpeech = useCallback(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      onErrorRef.current?.('Speech recognition not supported in this browser');
      return;
    }

    // Stop any existing session
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
    }
    if (webSpeechSilenceRef.current) {
      clearTimeout(webSpeechSilenceRef.current);
      webSpeechSilenceRef.current = null;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = LANG_MAP[lang] || lang;
    recognition.interimResults = true;
    recognition.continuous = continuous;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';
    lastSpeechActivityRef.current = Date.now();

    /** Reset silence timer — auto-stop after 2s of no speech activity */
    const resetSilenceTimer = () => {
      if (continuous) return; // Don't auto-stop in continuous mode
      lastSpeechActivityRef.current = Date.now();
      if (webSpeechSilenceRef.current) clearTimeout(webSpeechSilenceRef.current);
      webSpeechSilenceRef.current = setTimeout(() => {
        // Only stop if we have some transcript (user actually spoke)
        if (finalTranscript.trim() && recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch { /* ignore */ }
        }
      }, 2000);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimTranscript(interim || finalTranscript);
      resetSilenceTimer();
    };

    recognition.onend = () => {
      if (webSpeechSilenceRef.current) {
        clearTimeout(webSpeechSilenceRef.current);
        webSpeechSilenceRef.current = null;
      }
      setIsListening(false);
      setInterimTranscript('');
      const text = correctMedicalTerms(finalTranscript.trim());
      if (text) {
        onResultRef.current?.(text);
      }
      recognitionRef.current = null;
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (webSpeechSilenceRef.current) {
        clearTimeout(webSpeechSilenceRef.current);
        webSpeechSilenceRef.current = null;
      }
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        onErrorRef.current?.(event.error);
      }
      setIsListening(false);
      setInterimTranscript('');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setInterimTranscript('');

    // Start initial silence timer — if user doesn't speak at all for 5s, stop
    if (!continuous) {
      webSpeechSilenceRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch { /* ignore */ }
        }
      }, 5000);
    }
  }, [lang, continuous]);

  const stopWebSpeech = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
  }, []);

  // ── Unified start/stop/toggle ─────────────────────────────────────
  const startListening = useCallback(() => {
    if (activeProvider === 'deepgram') {
      startDeepgram();
    } else {
      startWebSpeech();
    }
  }, [activeProvider, startDeepgram, startWebSpeech]);

  const stopListening = useCallback(() => {
    if (activeProvider === 'deepgram') {
      stopDeepgram();
    } else {
      stopWebSpeech();
    }
  }, [activeProvider, stopDeepgram, stopWebSpeech]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    supported,
    isListening,
    interimTranscript,
    startListening,
    stopListening,
    toggleListening,
    activeProvider,
  };
}
