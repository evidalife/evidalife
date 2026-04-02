'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseVoiceInputOptions {
  /** BCP-47 language code, e.g. 'en-US', 'de-DE' */
  lang?: string;
  /** Called with the final transcript when speech recognition ends */
  onResult?: (transcript: string) => void;
  /** Called when an error occurs */
  onError?: (error: string) => void;
}

export interface UseVoiceInputReturn {
  /** Whether the browser supports Web Speech API */
  supported: boolean;
  /** Whether the mic is currently listening */
  isListening: boolean;
  /** Interim (in-progress) transcript while the user is speaking */
  interimTranscript: string;
  /** Start listening (push-to-talk: call this on button press) */
  startListening: () => void;
  /** Stop listening (push-to-talk: call this on button release) */
  stopListening: () => void;
  /** Toggle listening on/off */
  toggleListening: () => void;
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
 * Hook for push-to-talk voice input using the Web Speech API.
 *
 * Usage:
 *   const { supported, isListening, interimTranscript, toggleListening } = useVoiceInput({
 *     lang: 'en',
 *     onResult: (text) => sendQuestion(text),
 *   });
 */
export function useVoiceInput({
  lang = 'en',
  onResult,
  onError,
}: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const [supported, setSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  // Keep callback refs current without causing re-renders
  onResultRef.current = onResult;
  onErrorRef.current = onError;

  // Check browser support on mount
  useEffect(() => {
    const SR = typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;
    setSupported(!!SR);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      onErrorRef.current?.('Speech recognition not supported in this browser');
      return;
    }

    // Stop any existing session
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = LANG_MAP[lang] || lang;
    recognition.interimResults = true;
    recognition.continuous = true; // keep listening until we stop
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

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
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      // Deliver the final transcript
      const text = finalTranscript.trim();
      if (text) {
        onResultRef.current?.(text);
      }
      recognitionRef.current = null;
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' and 'aborted' are expected when user doesn't say anything
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
  }, [lang]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop(); // triggers onend → delivers final transcript
      } catch { /* ignore */ }
    }
  }, []);

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
  };
}
