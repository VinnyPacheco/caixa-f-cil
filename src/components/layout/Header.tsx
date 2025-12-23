import { useNavigate } from 'react-router-dom';
import { NotificationList } from '@/components/notifications/NotificationList';
import { useNotificationContext } from '@/contexts/NotificationContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showAvatar?: boolean;
  showBack?: boolean;
  showNotification?: boolean;
  userName?: string;
}

export function Header({
  title,
  subtitle,
  showAvatar = false,
  showBack = false,
  showNotification = false,
  userName = 'Usuário',
}: HeaderProps) {
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    pushPermission, 
    requestPushPermission 
  } = useNotificationContext();

  const handleNotificationClick = (transactionId: string) => {
    navigate('/transactions');
  };

  return (
    <header className="flex items-center px-6 pt-6 pb-2 justify-between sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
      {showBack ? (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center p-2 -ml-2 rounded-full hover:bg-foreground/5 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
      ) : showAvatar ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          >
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12 border-2 border-accent bg-muted flex items-center justify-center hover:border-primary transition-colors"
            >
              <span className="material-symbols-outlined text-muted-foreground">person</span>
            </div>
            <div className="absolute bottom-0 right-0 size-3 bg-success rounded-full border-2 border-background" />
          </button>
          <div className="flex flex-col">
            <p className="text-muted-foreground text-sm font-medium leading-none">
              {subtitle || 'Bem-vindo de volta,'}
            </p>
            <h2 className="text-foreground text-xl font-bold leading-tight mt-0.5">
              {userName}
            </h2>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {subtitle && (
            <p className="text-muted-foreground text-sm font-medium leading-none">{subtitle}</p>
          )}
          {title && (
            <h1 className="text-foreground text-xl font-bold leading-tight mt-0.5">{title}</h1>
          )}
        </div>
      )}

      {title && !showAvatar && !showBack && (
        <h1 className="text-lg font-bold text-foreground absolute left-1/2 -translate-x-1/2">
          {title}
        </h1>
      )}

      {showNotification ? (
        <NotificationList
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onNotificationClick={handleNotificationClick}
          pushPermission={pushPermission}
          onRequestPushPermission={requestPushPermission}
        />
      ) : showBack ? (
        <div className="w-10" />
      ) : null}
    </header>
  );
}
