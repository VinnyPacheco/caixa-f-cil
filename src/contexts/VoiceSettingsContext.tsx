import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface VoiceSettingsContextType {
  autoSaveVoiceTransaction: boolean;
  setAutoSaveVoiceTransaction: (value: boolean) => void;
}

const VoiceSettingsContext = createContext<VoiceSettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'voice-auto-save-transaction';

export function VoiceSettingsProvider({ children }: { children: ReactNode }) {
  const [autoSaveVoiceTransaction, setAutoSaveVoiceTransactionState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  const setAutoSaveVoiceTransaction = (value: boolean) => {
    setAutoSaveVoiceTransactionState(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  };

  return (
    <VoiceSettingsContext.Provider value={{ autoSaveVoiceTransaction, setAutoSaveVoiceTransaction }}>
      {children}
    </VoiceSettingsContext.Provider>
  );
}

export function useVoiceSettings() {
  const context = useContext(VoiceSettingsContext);
  if (context === undefined) {
    throw new Error('useVoiceSettings must be used within a VoiceSettingsProvider');
  }
  return context;
}
