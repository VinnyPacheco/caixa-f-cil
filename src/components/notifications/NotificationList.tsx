import { AppNotification } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { Bell, BellOff, Check, CheckCheck, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface NotificationListProps {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNotificationClick?: (transactionId: string) => void;
  pushPermission: NotificationPermission;
  onRequestPushPermission: () => Promise<boolean>;
}

export function NotificationList({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
  pushPermission,
  onRequestPushPermission,
}: NotificationListProps) {
  const { toast } = useToast();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestPermission = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isRequesting) return;
    
    setIsRequesting(true);
    
    try {
      const granted = await onRequestPushPermission();
      
      if (granted) {
        toast({
          title: 'Notificações ativadas',
          description: 'Você receberá alertas sobre lançamentos vencidos.',
        });
      } else if (Notification.permission === 'denied') {
        toast({
          title: 'Notificações bloqueadas',
          description: 'Você bloqueou as notificações. Para ativá-las, acesse as configurações do seu navegador.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Notificações não ativadas',
          description: 'As notificações não foram ativadas.',
        });
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível ativar as notificações.',
        variant: 'destructive',
      });
    } finally {
      setIsRequesting(false);
    }
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative flex items-center justify-center rounded-full size-10 bg-card shadow-sm text-accent transition-transform active:scale-95">
          <span className="material-symbols-outlined icon-filled">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 text-[10px] font-bold text-destructive-foreground bg-destructive rounded-full animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">Notificações</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={onMarkAllAsRead}
            >
              <CheckCheck className="size-3.5 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {pushPermission !== 'granted' && (
          <div className="px-4 py-3 bg-amber-500/10 border-b border-border">
            <div className="flex items-start gap-2">
              <BellOff className="size-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {pushPermission === 'denied' 
                    ? 'Notificações bloqueadas. Acesse as configurações do navegador para ativá-las.'
                    : 'Ative as notificações para ser avisado mesmo com o app fechado'}
                </p>
                {pushPermission !== 'denied' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={handleRequestPermission}
                    disabled={isRequesting}
                  >
                    {isRequesting ? (
                      <Loader2 className="size-3 mr-1 animate-spin" />
                    ) : (
                      <Bell className="size-3 mr-1" />
                    )}
                    {isRequesting ? 'Ativando...' : 'Ativar notificações'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Check className="size-10 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
              <p className="text-xs">Você está em dia!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={() => onMarkAsRead(notification.id)}
                  onClick={() => onNotificationClick?.(notification.transactionId)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

interface NotificationItemProps {
  notification: AppNotification;
  onMarkAsRead: () => void;
  onClick?: () => void;
}

function NotificationItem({ notification, onMarkAsRead, onClick }: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead();
    }
    onClick?.();
  };

  return (
    <button
      className={cn(
        "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors",
        !notification.read && "bg-accent/5"
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex items-center justify-center size-9 rounded-full shrink-0",
            notification.type === 'overdue' 
              ? "bg-destructive/15 text-destructive" 
              : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          )}
        >
          {notification.type === 'overdue' ? (
            <AlertTriangle className="size-4" />
          ) : (
            <Clock className="size-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-sm font-medium truncate",
              notification.read ? "text-muted-foreground" : "text-foreground"
            )}>
              {notification.title}
            </p>
            {!notification.read && (
              <span className="size-2 bg-accent rounded-full shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            {notification.date}
          </p>
        </div>
      </div>
    </button>
  );
}
