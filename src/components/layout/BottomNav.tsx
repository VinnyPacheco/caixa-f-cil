import { useLocation, useNavigate } from 'react-router-dom';

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
  { path: '/settings', icon: 'folder_open', label: 'Cadastros' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const handleAddClick = () => {
    navigate('/new-transaction');
  };

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
      </div>
      <div className="h-5 w-full" />
    </nav>
  );
}
