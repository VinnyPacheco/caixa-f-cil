import { useState, useEffect, useCallback, useMemo } from 'react';
import { Transaction, Category } from '@/types/finance';
import { differenceInDays, parseISO, startOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface AppNotification {
  id: string;
  transactionId: string;
  title: string;
  message: string;
  type: 'overdue' | 'due-today';
  date: string;
  read: boolean;
  categoryIcon?: string;
  categoryColor?: string;
}

interface UseNotificationsProps {
  transactions: Transaction[];
  categories: Category[];
}

const READ_NOTIFICATIONS_KEY = 'read-notifications';
const PUSH_PERMISSION_KEY = 'push-notifications-permission';

export function useNotifications({ transactions, categories }: UseNotificationsProps) {
  const [readNotifications, setReadNotifications] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(READ_NOTIFICATIONS_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
  });

  // Generate notifications from transactions
  const notifications: AppNotification[] = useMemo(() => {
    const today = startOfDay(new Date());
    
    return transactions
      .filter((t) => {
        if (t.isPaid) return false;
        const dueDate = startOfDay(parseISO(t.date));
        const daysUntilDue = differenceInDays(dueDate, today);
        return daysUntilDue <= 0; // Due today or overdue
      })
      .map((t) => {
        const dueDate = startOfDay(parseISO(t.date));
        const daysUntilDue = differenceInDays(dueDate, today);
        const category = categories.find((c) => c.id === t.categoryId);
        
        const isOverdue = daysUntilDue < 0;
        const daysOverdue = Math.abs(daysUntilDue);
        const notificationType: 'overdue' | 'due-today' = isOverdue ? 'overdue' : 'due-today';
        
        return {
          id: `notif-${t.id}`,
          transactionId: t.id,
          title: isOverdue ? 'Lançamento vencido' : 'Vence hoje',
          message: isOverdue 
            ? `${t.description} está vencido há ${daysOverdue} ${daysOverdue === 1 ? 'dia' : 'dias'}`
            : `${t.description} vence hoje`,
          type: notificationType,
          date: format(parseISO(t.date), "dd 'de' MMMM", { locale: ptBR }),
          read: readNotifications.has(`notif-${t.id}`),
          categoryIcon: category?.icon,
          categoryColor: category?.color,
        } as AppNotification;
      })
      .sort((a, b) => {
        // Overdue first, then by read status
        if (a.type !== b.type) return a.type === 'overdue' ? -1 : 1;
        if (a.read !== b.read) return a.read ? 1 : -1;
        return 0;
      });
  }, [transactions, categories, readNotifications]);

  const unreadCount = useMemo(() => 
    notifications.filter((n) => !n.read).length, 
    [notifications]
  );

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setReadNotifications((prev) => {
      const newSet = new Set(prev);
      newSet.add(notificationId);
      localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify([...newSet]));
      return newSet;
    });
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setReadNotifications((prev) => {
      const newSet = new Set(prev);
      notifications.forEach((n) => newSet.add(n.id));
      localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify([...newSet]));
      return newSet;
    });
  }, [notifications]);

  // Request push notification permission
  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    // Check if permission was already denied permanently
    if (Notification.permission === 'denied') {
      setPushPermission('denied');
      return false;
    }

    try {
      // Request permission - this will show the browser's permission dialog
      const permission = await Notification.requestPermission();
      console.log('Notification permission result:', permission);
      setPushPermission(permission);
      localStorage.setItem(PUSH_PERMISSION_KEY, permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  // Send push notification
  const sendPushNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (pushPermission !== 'granted') return;
    
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [pushPermission]);

  // Check and send notifications on app load
  useEffect(() => {
    if (pushPermission !== 'granted') return;
    
    const lastNotificationCheck = localStorage.getItem('last-notification-check');
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Only send once per day
    if (lastNotificationCheck === today) return;
    
    const unreadNotifications = notifications.filter((n) => !n.read);
    
    if (unreadNotifications.length > 0) {
      const overdueCount = unreadNotifications.filter((n) => n.type === 'overdue').length;
      const dueTodayCount = unreadNotifications.filter((n) => n.type === 'due-today').length;
      
      let body = '';
      if (overdueCount > 0 && dueTodayCount > 0) {
        body = `Você tem ${overdueCount} lançamento(s) vencido(s) e ${dueTodayCount} que vence(m) hoje`;
      } else if (overdueCount > 0) {
        body = `Você tem ${overdueCount} lançamento(s) vencido(s)`;
      } else {
        body = `Você tem ${dueTodayCount} lançamento(s) que vence(m) hoje`;
      }
      
      sendPushNotification('Planner Financeiro', {
        body,
        tag: 'due-notifications',
        requireInteraction: true,
      });
      
      localStorage.setItem('last-notification-check', today);
    }
  }, [notifications, pushPermission, sendPushNotification]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    pushPermission,
    requestPushPermission,
    sendPushNotification,
  };
}
