import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha seu e-mail e senha.',
        variant: 'destructive',
      });
      return;
    }

    // Mock login - navigate to home
    toast({
      title: 'Bem-vindo!',
      description: 'Login realizado com sucesso.',
    });
    navigate('/');
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background">
      <div className="flex flex-col items-center justify-center pt-16 pb-6 px-6">
        <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-6 shadow-xl shadow-accent/15 ring-1 ring-card">
          <span className="material-symbols-outlined text-accent text-[32px]">
            account_balance_wallet
          </span>
        </div>
        <h1 className="text-foreground tracking-tight text-[32px] font-bold leading-tight text-center">
          Bem-vindo de volta
        </h1>
        <p className="text-muted-foreground text-base font-medium leading-normal pt-3 text-center max-w-[280px]">
          Gerencie suas finanças com tranquilidade.
        </p>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col px-6 gap-5 w-full max-w-[420px] mx-auto mt-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-foreground text-sm font-semibold leading-normal ml-1">
            E-mail
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-muted-foreground group-focus-within:text-accent transition-colors">
                mail
              </span>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="block w-full rounded-xl border-0 py-4 pl-11 pr-4 text-foreground bg-card ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-accent text-base shadow-sm shadow-accent/5 transition-shadow"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-foreground text-sm font-semibold leading-normal ml-1">
            Senha
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-muted-foreground group-focus-within:text-accent transition-colors">
                lock
              </span>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="block w-full rounded-xl border-0 py-4 pl-11 pr-12 text-foreground bg-card ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-accent text-base shadow-sm shadow-accent/5 transition-shadow"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center"
            >
              <span className="material-symbols-outlined text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" className="text-sm font-semibold text-accent hover:text-accent/80 transition-colors">
            Esqueceu a senha?
          </button>
        </div>

        <button
          type="submit"
          className="flex w-full items-center justify-center rounded-xl bg-accent py-4 px-4 text-base font-bold text-accent-foreground shadow-lg shadow-accent/25 hover:brightness-95 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 mt-2"
        >
          Entrar
        </button>

        <div className="relative my-2">
          <div aria-hidden="true" className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/50"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
              ou continue com
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl bg-card p-3 text-sm font-semibold text-foreground ring-1 ring-inset ring-border hover:bg-secondary transition-colors shadow-sm"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl bg-card p-3 text-sm font-semibold text-foreground ring-1 ring-inset ring-border hover:bg-secondary transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[22px]">ios</span>
            Apple
          </button>
        </div>
      </form>

      <div className="mt-auto pb-8 pt-6">
        <p className="text-center text-sm text-muted-foreground">
          Não tem uma conta?{' '}
          <button
            onClick={() => navigate('/signup')}
            className="font-bold text-accent hover:text-accent/80 hover:underline decoration-accent decoration-2 underline-offset-2 transition-colors"
          >
            Cadastre-se
          </button>
        </p>
      </div>
    </div>
  );
}
