import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';

interface SettingItem {
  icon: string;
  label: string;
  description?: string;
  path?: string;
  action?: () => void;
}

const settingsGroups: { title: string; items: SettingItem[] }[] = [
  {
    title: 'Cadastros',
    items: [
      { icon: 'account_balance', label: 'Contas', description: 'Gerenciar contas bancárias e cartões', path: '/accounts' },
      { icon: 'category', label: 'Categorias', description: 'Gerenciar categorias de lançamentos', path: '/categories' },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { icon: 'person', label: 'Perfil', description: 'Dados pessoais e avatar', path: '/profile' },
      { icon: 'notifications', label: 'Notificações', description: 'Alertas e lembretes' },
      { icon: 'security', label: 'Segurança', description: 'Senha e autenticação' },
    ],
  },
  {
    title: 'Sobre',
    items: [
      { icon: 'help', label: 'Ajuda', description: 'Central de ajuda e FAQ' },
      { icon: 'info', label: 'Sobre o App', description: 'Versão e informações legais' },
    ],
  },
];

export default function Settings() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleItemClick = (item: SettingItem) => {
    if (item.path) {
      navigate(item.path);
    } else if (item.action) {
      item.action();
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <AppLayout>
      <Header title="Cadastros" showBack />

      <main className="flex flex-col gap-6 p-6">
        {settingsGroups.map((group) => (
          <div key={group.title} className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
              {group.title}
            </h3>
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/50">
              {group.items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleItemClick(item)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
                >
                  <div className="size-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-accent">{item.icon}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-foreground">{item.label}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-muted-foreground">chevron_right</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-destructive/10 text-destructive font-semibold hover:bg-destructive/20 transition-colors"
        >
          <span className="material-symbols-outlined">logout</span>
          Sair da Conta
        </button>
      </main>
    </AppLayout>
  );
}
