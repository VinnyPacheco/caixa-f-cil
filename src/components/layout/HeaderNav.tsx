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
  { path: '/import-transactions', icon: 'upload_file', label: 'Importar' },
];

export function HeaderNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCadastrosMenu, setShowCadastrosMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingTranscriptRef = useRef<string | null>(null);

  const handleVoiceResult = useCallback((transcript: string) => {
    pendingTranscriptRef.current = transcript;
  }, []);

  const { isListening, isHolding, transcript, isSupported, startHold, endHold } =
    useVoiceInput(handleVoiceResult);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowCadastrosMenu(false);
      }
    };
    if (showCadastrosMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
      navigate('/new-transaction');
    } else {
      setTimeout(() => {
        const voiceText = pendingTranscriptRef.current || transcript;
        pendingTranscriptRef.current = null;
        if (voiceText) {
          toast({ title: 'Áudio capturado', description: voiceText });
          navigate('/new-transaction', { state: { voiceText } });
        } else {
          navigate('/new-transaction');
        }
      }, 300);
    }
  }, [endHold, navigate, toast, transcript]);

  const isActive = (path: string) => {
    if (path === '/cadastros') {
      return (
        location.pathname === '/accounts' ||
        location.pathname === '/categories' ||
        location.pathname === '/import-transactions'
      );
    }
    return location.pathname === path;
  };

  const renderNavButton = (item: NavItem) => {
    const active = isActive(item.path);

    const buttonInner = (
      <>
        <span
          className={`material-symbols-outlined text-xl ${
            active ? 'text-accent icon-filled' : 'text-muted-foreground'
          }`}
        >
          {item.icon}
        </span>
        <span
          className={`text-xs ${
            active ? 'text-accent font-semibold' : 'text-muted-foreground font-medium'
          }`}
        >
          {item.label}
        </span>
      </>
    );

    if (item.hasSubmenu) {
      return (
        <div key={item.path} className="relative" ref={menuRef}>
          {showCadastrosMenu && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-card border border-border/50 rounded-xl shadow-lg overflow-hidden z-50 min-w-[160px]">
              {cadastrosSubmenu.map((subItem) => (
                <button
                  key={subItem.path}
                  onClick={() => handleSubmenuClick(subItem.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors ${
                    location.pathname === subItem.path ? 'bg-accent/10 text-accent' : 'text-foreground'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{subItem.icon}</span>
                  <span className="text-sm font-medium">{subItem.label}</span>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => handleNavClick(item)}
            className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-foreground/5 transition-colors"
          >
            {buttonInner}
          </button>
        </div>
      );
    }

    return (
      <button
        key={item.path}
        onClick={() => handleNavClick(item)}
        className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-foreground/5 transition-colors"
      >
        {buttonInner}
      </button>
    );
  };

  return (
    <div className="hidden md:flex items-center gap-1 bg-card/60 border border-border/50 rounded-full px-2 py-1 shadow-sm">
      {navItems.slice(0, 2).map((item) => renderNavButton(item))}

      {/* Central FAB with Voice Input */}
      <button
        onMouseDown={isSupported ? startHold : undefined}
        onMouseUp={isSupported ? handleHoldEnd : () => navigate('/new-transaction')}
        onTouchStart={isSupported ? startHold : undefined}
        onTouchEnd={isSupported ? handleHoldEnd : () => navigate('/new-transaction')}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative mx-1 size-10 rounded-full bg-accent shadow-md shadow-accent/30 flex items-center justify-center text-accent-foreground transition-all duration-200 select-none touch-none ${
          isListening
            ? 'scale-110 ring-4 ring-accent/50 animate-pulse'
            : isHolding
              ? 'scale-105 ring-2 ring-accent/30'
              : ''
        }`}
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
        aria-label={isListening ? 'Gravando áudio...' : 'Novo lançamento (segure para voz)'}
      >
        {isHolding && !isListening && (
          <span className="absolute inset-0 rounded-full bg-accent-foreground/20 animate-ping" />
        )}
        {isListening ? (
          <span className="material-symbols-outlined text-xl">mic</span>
        ) : (
          <div className="flex items-center gap-0.5">
            <span className="material-symbols-outlined text-lg">add</span>
            <span className="material-symbols-outlined text-base">mic</span>
          </div>
        )}
      </button>

      {navItems.slice(2).map((item) => renderNavButton(item))}
    </div>
  );
}