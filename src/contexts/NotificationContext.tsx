import { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNotifications, AppNotification } from '@/hooks/useNotifications';
import { fetchTransactions } from '@/services/transactionsService';
import { fetchCategories } from '@/services/categoriesService';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  pushPermission: NotificationPermission;
  requestPushPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    enabled: !!user,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: !!user,
  });

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    pushPermission,
    requestPushPermission,
  } = useNotifications({
    transactions: transactionsQuery.data || [],
    categories: categoriesQuery.data || [],
  });

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        pushPermission,
        requestPushPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
}
