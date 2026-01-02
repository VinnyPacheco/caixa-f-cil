import { useState, useCallback, useRef, useEffect } from 'react';

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface VoiceInputState {
  isListening: boolean;
  isHolding: boolean;
  transcript: string;
  error: string | null;
}

export function useVoiceInput(onResult: (transcript: string) => void) {
  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    isHolding: false,
    transcript: '',
    error: null,
  });

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const isHoldingRef = useRef(false);

  // Check if Web Speech API is supported
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setState(prev => ({
        ...prev,
        transcript: finalTranscript || interimTranscript,
      }));
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setState(prev => ({
        ...prev,
        isListening: false,
        error: event.error,
      }));
    };

    recognition.onend = () => {
      setState(prev => {
        if (prev.transcript && isHoldingRef.current === false) {
          onResult(prev.transcript);
        }
        return {
          ...prev,
          isListening: false,
        };
      });
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [isSupported, onResult]);

  const startHold = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return;

    isHoldingRef.current = true;
    setState(prev => ({ ...prev, isHolding: true, error: null }));

    // Start listening after 0.5 seconds of holding
    holdTimeoutRef.current = window.setTimeout(() => {
      // Clear the timeout ref since it has fired
      holdTimeoutRef.current = null;
      
      if (isHoldingRef.current && recognitionRef.current) {
        setState(prev => ({ ...prev, isListening: true, transcript: '' }));
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error('Error starting recognition:', e);
        }
      }
    }, 500);
  }, [isSupported]);

  const endHold = useCallback((): boolean => {
    isHoldingRef.current = false;
    
    // Check if the hold was short (timeout still pending = less than 0.5s)
    const wasShortClick = holdTimeoutRef.current !== null;
    
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    setState(prev => ({ ...prev, isHolding: false }));

    if (recognitionRef.current && state.isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
    }
    
    // Return true if it was a short click (should navigate)
    return wasShortClick && !state.isListening;
  }, [state.isListening]);

  return {
    ...state,
    isSupported,
    startHold,
    endHold,
  };
}
