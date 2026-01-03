import { useCallback, useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useToast } from '@/hooks/use-toast';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  hasSubmenu?: boolean;
}

interface SubMenuItem {
  path: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { path: '/', icon: 'home', label: 'Início' },
  { path: '/transactions', icon: 'receipt_long', label: 'Transações' },
  { path: '/reports', icon: 'bar_chart', label: 'Relatórios' },
  { path: '/cadastros', icon: 'folder', label: 'Cadastros', hasSubmenu: true },
];

const cadastrosSubmenu: SubMenuItem[] = [
  { path: '/accounts', icon: 'account_balance_wallet', label: 'Contas' },
  { path: '/categories', icon: 'category', label: 'Categorias' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCadastrosMenu, setShowCadastrosMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingTranscriptRef = useRef<string | null>(null);

  const handleVoiceResult = useCallback((transcript: string) => {
    console.log('Voice transcript received:', transcript);
    // Store the transcript, navigation will happen on button release
    pendingTranscriptRef.current = transcript;
  }, []);

  const { isListening, isHolding, transcript, isSupported, startHold, endHold } = useVoiceInput(handleVoiceResult);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowCadastrosMenu(false);
      }
    };

    if (showCadastrosMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCadastrosMenu]);

  const handleNavClick = (item: NavItem) => {
    if (item.hasSubmenu) {
      setShowCadastrosMenu(!showCadastrosMenu);
    } else {
      setShowCadastrosMenu(false);
      navigate(item.path);
    }
  };

  const handleSubmenuClick = (path: string) => {
    setShowCadastrosMenu(false);
    navigate(path);
  };

  const handleHoldEnd = useCallback(() => {
    const wasShortClick = endHold();
    
    if (wasShortClick) {
      // Short click - just navigate without voice
      navigate('/new-transaction');
    } else {
      // Long press - wait a bit for final transcript, then navigate
      setTimeout(() => {
        const voiceText = pendingTranscriptRef.current || transcript;
        pendingTranscriptRef.current = null;
        
        if (voiceText) {
          toast({
            title: 'Áudio capturado',
            description: voiceText,
          });
          navigate('/new-transaction', { state: { voiceText } });
        } else {
          // No transcript captured, still navigate
          navigate('/new-transaction');
        }
      }, 300);
    }
  }, [endHold, navigate, toast, transcript]);

  const isActive = (path: string) => {
    if (path === '/cadastros') {
      return location.pathname === '/accounts' || location.pathname === '/categories';
    }
    return location.pathname === path;
  };

  const renderNavButton = (item: NavItem) => {
    const active = isActive(item.path);
    
    if (item.hasSubmenu) {
      return (
        <div key={item.path} className="relative" ref={menuRef}>
          {/* Drop-up Menu */}
          {showCadastrosMenu && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-card border border-border/50 rounded-xl shadow-lg overflow-hidden z-50 min-w-[140px]">
              {cadastrosSubmenu.map((subItem) => (
                <button
                  key={subItem.path}
                  onClick={() => handleSubmenuClick(subItem.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors ${
                    location.pathname === subItem.path ? 'bg-accent/10 text-accent' : 'text-foreground'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">
                    {subItem.icon}
                  </span>
                  <span className="text-sm font-medium">{subItem.label}</span>
                </button>
              ))}
            </div>
          )}
          
          <button
            onClick={() => handleNavClick(item)}
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
        </div>
      );
    }

    return (
      <button
        key={item.path}
        onClick={() => handleNavClick(item)}
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
  };

  return (
    <nav className="fixed bottom-0 w-full bg-background/50 backdrop-blur-sm pb-safe pt-1 px-4 z-50 rounded-t-[28px] shadow-[0_-4px_30px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-around h-14 relative max-w-lg mx-auto">
        {/* First two nav items */}
        {navItems.slice(0, 2).map((item) => renderNavButton(item))}

        {/* FAB Button with Voice Input */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-10">
          <button
            onMouseDown={isSupported ? startHold : undefined}
            onMouseUp={isSupported ? handleHoldEnd : () => navigate('/new-transaction')}
            onTouchStart={isSupported ? startHold : undefined}
            onTouchEnd={isSupported ? handleHoldEnd : () => navigate('/new-transaction')}
            onContextMenu={(e) => e.preventDefault()}
            className={`size-16 rounded-full bg-accent shadow-lg shadow-accent/30 flex items-center justify-center text-accent-foreground transition-all duration-200 select-none touch-none ${
              isListening 
                ? 'scale-110 ring-4 ring-accent/50 animate-pulse' 
                : isHolding 
                  ? 'scale-105 ring-2 ring-accent/30' 
                  : ''
            }`}
            style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
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
        {navItems.slice(2).map((item) => renderNavButton(item))}
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
