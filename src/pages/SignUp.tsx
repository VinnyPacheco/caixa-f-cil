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
