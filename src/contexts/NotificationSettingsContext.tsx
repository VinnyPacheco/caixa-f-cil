import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface NotificationSettingsContextValue {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
}

const NotificationSettingsContext = createContext<NotificationSettingsContextValue | null>(null);

const STORAGE_KEY = 'notifications_enabled';

export function NotificationSettingsProvider({ children }: { children: ReactNode }) {
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null ? stored === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(notificationsEnabled));
  }, [notificationsEnabled]);

  const setNotificationsEnabled = (enabled: boolean) => {
    setNotificationsEnabledState(enabled);
  };

  return (
    <NotificationSettingsContext.Provider value={{ notificationsEnabled, setNotificationsEnabled }}>
      {children}
    </NotificationSettingsContext.Provider>
  );
}

export function useNotificationSettings() {
  const context = useContext(NotificationSettingsContext);
  if (!context) {
    throw new Error('useNotificationSettings must be used within NotificationSettingsProvider');
  }
  return context;
}
