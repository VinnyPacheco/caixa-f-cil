import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function SignUp() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signInWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Senhas não conferem',
        description: 'As senhas digitadas não são iguais.',
        variant: 'destructive',
      });
      return;
    }

    if (!acceptTerms) {
      toast({
        title: 'Termos de uso',
        description: 'Aceite os termos de uso para continuar.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Conta criada!',
      description: 'Sua conta foi criada com sucesso.',
    });
    navigate('/');
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: 'Erro ao entrar com Google',
        description: error.message,
        variant: 'destructive',
      });
    }
    setIsGoogleLoading(false);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background">
      <div className="flex flex-col items-center justify-center pt-8 pb-4 px-6">
        <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-4 shadow-xl shadow-accent/15 ring-1 ring-card">
          <span className="material-symbols-outlined text-accent text-[32px]">
            account_balance_wallet
          </span>
        </div>
        <h1 className="text-foreground tracking-tight text-[28px] font-bold leading-tight text-center">
          Criar nova conta
        </h1>
        <p className="text-muted-foreground text-sm font-medium leading-normal pt-2 text-center max-w-[280px]">
          Preencha seus dados para começar a controlar suas finanças.
        </p>
      </div>

      <form onSubmit={handleSignUp} className="flex flex-col px-6 gap-4 w-full max-w-[420px] mx-auto mt-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-foreground text-sm font-semibold leading-normal ml-1">
            Nome completo
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-muted-foreground group-focus-within:text-accent transition-colors">
                person
              </span>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="block w-full rounded-xl border-0 py-3.5 pl-11 pr-4 text-foreground bg-card ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-accent text-base shadow-sm shadow-accent/5 transition-shadow"
            />
          </div>
        </div>

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
              className="block w-full rounded-xl border-0 py-3.5 pl-11 pr-4 text-foreground bg-card ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-accent text-base shadow-sm shadow-accent/5 transition-shadow"
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
              placeholder="Mínimo 6 caracteres"
              className="block w-full rounded-xl border-0 py-3.5 pl-11 pr-12 text-foreground bg-card ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-accent text-base shadow-sm shadow-accent/5 transition-shadow"
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

        <div className="flex flex-col gap-1.5">
          <label className="text-foreground text-sm font-semibold leading-normal ml-1">
            Confirmar senha
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-muted-foreground group-focus-within:text-accent transition-colors">
                lock
              </span>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              className="block w-full rounded-xl border-0 py-3.5 pl-11 pr-4 text-foreground bg-card ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-accent text-base shadow-sm shadow-accent/5 transition-shadow"
            />
          </div>
        </div>

        <label className="flex items-start gap-3 mt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-0.5 h-5 w-5 rounded border-border text-accent focus:ring-accent"
          />
          <span className="text-sm text-muted-foreground leading-tight">
            Aceito os{' '}
            <button type="button" className="text-accent font-semibold hover:underline">
              Termos de Uso
            </button>{' '}
            e{' '}
            <button type="button" className="text-accent font-semibold hover:underline">
              Política de Privacidade
            </button>
          </span>
        </label>

        <button
          type="submit"
          className="flex w-full items-center justify-center rounded-xl bg-accent py-4 px-4 text-base font-bold text-accent-foreground shadow-lg shadow-accent/25 hover:brightness-95 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 mt-3"
        >
          Criar Conta
        </button>
      </form>

      {/* Google Sign In */}
      <div className="flex flex-col px-6 gap-4 w-full max-w-[420px] mx-auto mt-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className="flex w-full items-center justify-center rounded-xl border border-border py-3.5 px-4 text-base font-semibold text-foreground bg-card hover:bg-accent/5 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-50"
        >
          {isGoogleLoading ? (
            <span className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <svg className="mr-2 size-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          Continuar com Google
        </button>
      </div>

      <div className="mt-auto pb-8 pt-4">
        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <button
            onClick={() => navigate('/login')}
            className="font-bold text-accent hover:text-accent/80 hover:underline decoration-accent decoration-2 underline-offset-2 transition-colors"
          >
            Fazer login
          </button>
        </p>
      </div>
    </div>
  );
}
