'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function mapSpeechError(error: string): string {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Permiso de micrófono denegado.';
    case 'no-speech':
      return 'No se detectó voz. Intenta de nuevo.';
    case 'network':
      return 'Error de red al transcribir.';
    case 'audio-capture':
      return 'No se pudo acceder al micrófono.';
    case 'aborted':
      return '';
    default:
      return 'Error al transcribir la voz.';
  }
}

interface UseSpeechRecognitionOptions {
  onTranscription: (text: string) => void;
  lang?: string;
}

export function useSpeechRecognition({
  onTranscription,
  lang = 'es-ES',
}: UseSpeechRecognitionOptions) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onTranscriptionRef = useRef(onTranscription);

  useEffect(() => {
    onTranscriptionRef.current = onTranscription;
  }, [onTranscription]);

  useEffect(() => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      setIsSupported(false);
      return;
    }

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        onTranscriptionRef.current(transcript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const message = mapSpeechError(event.error);
      if (message) setError(message);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsSupported(true);

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // ignore if not started
      }
      recognitionRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setError(null);
    try {
      recognition.start();
    } catch {
      setError('No se pudo iniciar el dictado. Intenta de nuevo.');
      setIsListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  return {
    isSupported,
    isListening,
    error,
    start,
    stop,
    toggle,
    clearError: () => setError(null),
  };
}
