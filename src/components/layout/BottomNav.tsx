import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useToast } from '@/hooks/use-toast';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { path: '/', icon: 'home', label: 'Início' },
  { path: '/transactions', icon: 'receipt_long', label: 'Transações' },
  { path: '/reports', icon: 'bar_chart', label: 'Relatórios' },
  { path: '/accounts', icon: 'folder', label: 'Cadastros' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleVoiceResult = useCallback((transcript: string) => {
    console.log('Voice transcript:', transcript);
    toast({
      title: 'Áudio capturado',
      description: transcript,
    });
    navigate('/new-transaction', { state: { voiceText: transcript } });
  }, [navigate, toast]);

  const { isListening, isHolding, isSupported, startHold, endHold } = useVoiceInput(handleVoiceResult);

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const handleHoldEnd = useCallback(() => {
    const wasShortClick = endHold();
    if (wasShortClick) {
      navigate('/new-transaction');
    }
  }, [endHold, navigate]);

  const isActive = (path: string) => {
    if (path === '/accounts') {
      return location.pathname === '/accounts' || location.pathname === '/categories';
    }
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 w-full bg-background/30 backdrop-blur-sm pb-safe pt-1 px-4 z-50 rounded-t-[28px] shadow-[0_-4px_30px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-around h-14 relative max-w-lg mx-auto">
        {/* First two nav items */}
        {navItems.slice(0, 2).map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className="flex flex-col items-center justify-center gap-1 min-w-[60px]"
            >
              <span 
                className={`material-symbols-outlined text-2xl ${
                  active ? 'text-accent icon-filled' : 'text-muted-foreground'
                }`}
              >
                {item.icon}
              </span>
              <span className={`text-[11px] ${
                active ? 'text-accent font-semibold' : 'text-muted-foreground font-medium'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* FAB Button with Voice Input */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-10">
          <button
            onMouseDown={isSupported ? startHold : undefined}
            onMouseUp={isSupported ? handleHoldEnd : () => navigate('/new-transaction')}
            onMouseLeave={isSupported ? handleHoldEnd : undefined}
            onTouchStart={isSupported ? startHold : undefined}
            onTouchEnd={isSupported ? handleHoldEnd : () => navigate('/new-transaction')}
            onTouchCancel={isSupported ? handleHoldEnd : undefined}
            className={`size-16 rounded-full bg-accent shadow-lg shadow-accent/30 flex items-center justify-center text-accent-foreground transition-all duration-200 ${
              isListening 
                ? 'scale-110 ring-4 ring-accent/50 animate-pulse' 
                : isHolding 
                  ? 'scale-105 ring-2 ring-accent/30' 
                  : ''
            }`}
            aria-label={isListening ? 'Gravando áudio...' : 'Novo lançamento (segure para voz)'}
          >
            {/* Ripple effect when holding */}
            {isHolding && !isListening && (
              <span className="absolute inset-0 rounded-full bg-accent-foreground/20 animate-ping" />
            )}
            
            {/* Listening indicator rings */}
            {isListening && (
              <>
                <span className="absolute inset-[-8px] rounded-full border-2 border-accent/40 animate-ping" />
                <span className="absolute inset-[-4px] rounded-full border-2 border-accent/60 animate-pulse" />
              </>
            )}
            
            {isListening ? (
              <span className="material-symbols-outlined text-3xl">mic</span>
            ) : (
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-2xl">add</span>
                <span className="text-accent-foreground/40">|</span>
                <span className="material-symbols-outlined text-xl">mic</span>
              </div>
            )}
          </button>
        </div>

        {/* Last two nav items */}
        {navItems.slice(2).map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className="flex flex-col items-center justify-center gap-1 min-w-[60px]"
            >
              <span 
                className={`material-symbols-outlined text-2xl ${
                  active ? 'text-accent icon-filled' : 'text-muted-foreground'
                }`}
              >
                {item.icon}
              </span>
              <span className={`text-[11px] ${
                active ? 'text-accent font-semibold' : 'text-muted-foreground font-medium'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="h-2 w-full" />
      
      {/* Voice listening overlay indicator */}
      {isListening && (
        <div className="fixed inset-x-0 bottom-28 flex justify-center pointer-events-none z-50">
          <div className="bg-card/95 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-border/50 flex items-center gap-3">
            <span className="material-symbols-outlined text-accent animate-pulse">mic</span>
            <span className="text-sm font-medium text-foreground">Ouvindo...</span>
          </div>
        </div>
      )}
    </nav>
  );
}
