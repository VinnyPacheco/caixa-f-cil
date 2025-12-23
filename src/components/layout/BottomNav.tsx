import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  filled?: boolean;
}

const navItems: NavItem[] = [
  { path: '/', icon: 'home', label: 'Início' },
  { path: '/transactions', icon: 'receipt_long', label: 'Transações' },
  { path: '/reports', icon: 'bar_chart', label: 'Relatórios' },
];

const cadastroItems = [
  { path: '/accounts', icon: 'account_balance', label: 'Contas' },
  { path: '/categories', icon: 'category', label: 'Categorias' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [cadastroOpen, setCadastroOpen] = useState(false);

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const handleAddClick = () => {
    navigate('/new-transaction');
  };

  const handleCadastroItemClick = (path: string) => {
    setCadastroOpen(false);
    navigate(path);
  };

  const isCadastroActive = location.pathname === '/accounts' || location.pathname === '/categories';

  return (
    <nav className="fixed bottom-0 w-full bg-card border-t border-border pb-safe pt-2 px-6 z-50">
      <div className="flex items-center justify-between h-16 relative max-w-lg mx-auto">
        {navItems.slice(0, 2).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
            >
              <span className={`material-symbols-outlined ${isActive ? 'icon-filled' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* FAB Button */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6">
          <button
            onClick={handleAddClick}
            className="fab-button"
            aria-label="Novo lançamento"
          >
            <span className="material-symbols-outlined text-3xl">add</span>
          </button>
        </div>

        {/* Spacer for FAB */}
        <div className="w-8" />

        {navItems.slice(2).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
            >
              <span className={`material-symbols-outlined ${isActive ? 'icon-filled' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Cadastros with Popover Drop-up */}
        <Popover open={cadastroOpen} onOpenChange={setCadastroOpen}>
          <PopoverTrigger asChild>
            <button
              className={`nav-item ${isCadastroActive ? 'nav-item-active' : 'nav-item-inactive'}`}
            >
              <span className={`material-symbols-outlined ${isCadastroActive ? 'icon-filled' : ''}`}>
                folder_open
              </span>
              <span className={`text-[10px] ${isCadastroActive ? 'font-bold' : 'font-medium'}`}>
                Cadastros
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            sideOffset={12}
            className="w-56 p-2 bg-card border border-border/50 rounded-2xl shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2"
          >
            <div className="flex flex-col gap-1">
              {cadastroItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleCadastroItemClick(item.path)}
                  className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-accent/10 transition-colors text-left"
                >
                  <div className="size-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-accent">{item.icon}</span>
                  </div>
                  <span className="font-medium text-foreground">{item.label}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="h-5 w-full" />
    </nav>
  );
}
