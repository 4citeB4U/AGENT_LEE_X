"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { speakKokoroPreferred, listKokoroVoices, warmKokoro, speakKokoro } from '@/lib/kokoro-tts';

// Minimal, safe AppState for boot orchestration without requiring missing libs
export interface AppState {
  isInitializing: boolean;
  loadingMessage: string;
  backendOnline: boolean;
  frontendModelsReady: boolean;
  allModelsInitialized: boolean;
}

const initialAppState: AppState = {
  isInitializing: true,
  loadingMessage: 'Starting Agent Lee...%',
  backendOnline: false,
  frontendModelsReady: false,
  allModelsInitialized: false,
};

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(initialAppState);
  const [welcomeSpoken, setWelcomeSpoken] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      // Simulate staged initialization. Replace with real runtime/model init later.
      const steps = [
        'Loading voice configuration...%',
        'Connecting to backend runtime...%',
        'Loading frontend AI models (this may take a moment)...%',
      ];
      for (const msg of steps) {
        if (cancelled) return;
        setState((s) => ({ ...s, loadingMessage: msg }));
        await new Promise((r) => setTimeout(r, 300));
      }
      // Voice will be synthesized via Azure on demand; no pre-download needed.
      if (cancelled) return;
      setState({
        isInitializing: false,
        loadingMessage: 'Agent Lee is ready!%',
        backendOnline: false,
        frontendModelsReady: true,
        allModelsInitialized: true,
      });
    };
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Welcome speech once models are initialized
  useEffect(() => {
    // Preload Kokoro model as early as possible after mount
    warmKokoro().catch(() => {});
  }, []);

  // Welcome speech once models are initialized
  useEffect(() => {
    if (!state.allModelsInitialized || welcomeSpoken) return;
    const speak = async (text: string) => {
      // 1) Free, in-browser Kokoro.js (no API keys)
      try {
        // Log available voices once for quick debugging/selection
        try {
          const voices = await listKokoroVoices();
          // eslint-disable-next-line no-console
          console.log('Kokoro available voices:', voices);
        } catch {}
        // Use saved voice settings if available
        let chosenVoice = 'am_michael';
        let chosenSpeed = 0.95;
        try {
          const v = typeof window !== 'undefined' ? localStorage.getItem('agentlee_voice') : null;
          const s = typeof window !== 'undefined' ? localStorage.getItem('agentlee_voice_speed') : null;
          if (v) chosenVoice = v;
          if (s && !Number.isNaN(parseFloat(s))) chosenSpeed = parseFloat(s);
        } catch {}

        const kokoroDirect = speakKokoro(text, { voice: chosenVoice, speed: chosenSpeed });
        const timeoutDirect = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000));
        const ok = await Promise.race([kokoroDirect, timeoutDirect]);
        if (ok) return;
      } catch {}
      // 2) Browser speech synthesis fallback
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.95; utter.pitch = 0.9; utter.volume = 1.0;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }
    };
    const intro = "Welcome to Agent Lee by LEEWAY — your premium AI assistant. All systems are online and standing by. I can search, analyze documents, talk by voice, and streamline your daily workflow with speed and style. Let's get started.";
    speak(intro).finally(() => setWelcomeSpoken(true));
  }, [state.allModelsInitialized, welcomeSpoken]);

  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
};

export const useAppState = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within an AppProvider');
  return ctx;
};
