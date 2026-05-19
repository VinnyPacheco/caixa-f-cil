import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Check, X } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().trim().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

const passwordCriteria = [
  { id: 'minLength', label: 'Pelo menos 8 caracteres', test: (pw: string) => pw.length >= 8 },
  { id: 'lowercase', label: 'Uma letra minúscula', test: (pw: string) => /[a-z]/.test(pw) },
  { id: 'uppercase', label: 'Uma letra maiúscula', test: (pw: string) => /[A-Z]/.test(pw) },
  { id: 'number', label: 'Um número', test: (pw: string) => /[0-9]/.test(pw) },
  { id: 'special', label: 'Um caractere especial (!@#$%...)', test: (pw: string) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(pw) },
];

const signUpSchema = z.object({
  email: z.string().trim().email('Email inválido'),
  password: z.string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/[a-z]/, 'A senha deve ter uma letra minúscula')
    .regex(/[A-Z]/, 'A senha deve ter uma letra maiúscula')
    .regex(/[0-9]/, 'A senha deve ter um número')
    .regex(/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/, 'A senha deve ter um caractere especial'),
  fullName: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres').optional(),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

interface PasswordCriteriaItemProps {
  met: boolean;
  label: string;
}

function PasswordCriteriaItem({ met, label }: PasswordCriteriaItemProps) {
  return (
    <div className={`flex items-center gap-2 text-xs transition-all duration-200 ${met ? 'text-green-500' : 'text-muted-foreground'}`}>
      <div className={`size-4 rounded-full flex items-center justify-center transition-all duration-200 ${met ? 'bg-green-500/20' : 'bg-muted'}`}>
        {met ? (
          <Check className="size-3" />
        ) : (
          <X className="size-3" />
        )}
      </div>
      <span>{label}</span>
    </div>
  );
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordStrength = useMemo(() => {
    return passwordCriteria.map(criterion => ({
      ...criterion,
      met: criterion.test(password),
    }));
  }, [password]);

  const allCriteriaMet = passwordStrength.every(c => c.met);
  const metCount = passwordStrength.filter(c => c.met).length;
  const strengthPercentage = (metCount / passwordCriteria.length) * 100;

  const getStrengthColor = () => {
    if (strengthPercentage <= 20) return 'bg-destructive';
    if (strengthPercentage <= 40) return 'bg-orange-500';
    if (strengthPercentage <= 60) return 'bg-yellow-500';
    if (strengthPercentage <= 80) return 'bg-lime-500';
    return 'bg-green-500';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      if (isLogin) {
        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
          const fieldErrors: Record<string, string> = {};
          validation.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Erro ao entrar',
              description: 'Email ou senha incorretos.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Erro ao entrar',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          navigate('/transactions');
        }
      } else {
        const validation = signUpSchema.safeParse({ email, password, confirmPassword, fullName });
        if (!validation.success) {
          const fieldErrors: Record<string, string> = {};
          validation.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, fullName || undefined);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Erro ao cadastrar',
              description: 'Este email já está cadastrado.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Erro ao cadastrar',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Cadastro realizado!',
            description: 'Verifique seu email para confirmar a conta.',
          });
          setIsLogin(true);
        }
      }
    } finally {
      setIsLoading(false);
    }
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo/Header */}
        <div className="text-center space-y-2">
          <div className="size-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-accent text-3xl">
              account_balance_wallet
            </span>
          </div>
          <p className="text-sm font-semibold text-accent tracking-wide uppercase">
            Planner Financeiro
          </p>
          <h1 className="text-2xl font-bold text-foreground">
            {isLogin ? 'Bem-vindo de volta' : 'Criar conta'}
          </h1>
          <p className="text-muted-foreground">
            {isLogin 
              ? 'Entre para gerenciar suas finanças' 
              : 'Cadastre-se para começar'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Seu nome"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={errors.fullName ? 'border-destructive' : ''}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive">{errors.fullName}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}

            {/* Password Strength Indicator - only for signup */}
            {!isLogin && password.length > 0 && (
              <div className="space-y-3 pt-2 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                {/* Strength bar */}
                <div className="space-y-1">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 rounded-full ${getStrengthColor()}`}
                      style={{ width: `${strengthPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Força da senha: {metCount}/{passwordCriteria.length} critérios
                  </p>
                </div>

                {/* Criteria list */}
                <div className="grid gap-1.5">
                  {passwordStrength.map((criterion) => (
                    <PasswordCriteriaItem 
                      key={criterion.id}
                      met={criterion.met}
                      label={criterion.label}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={errors.confirmPassword ? 'border-destructive' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
              )}
              {!isLogin && confirmPassword.length > 0 && password === confirmPassword && (
                <div className="flex items-center gap-2 text-xs text-green-500 animate-in fade-in-0 duration-200">
                  <Check className="size-3" />
                  <span>Senhas coincidem</span>
                </div>
              )}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || (!isLogin && !allCriteriaMet)}
          >
            {isLoading 
              ? (isLogin ? 'Entrando...' : 'Cadastrando...') 
              : (isLogin ? 'Entrar' : 'Cadastrar')}
          </Button>
        </form>

        {/* Google Sign In */}
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <span className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg className="mr-2 size-4" viewBox="0 0 24 24">
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
          </Button>
        </div>

        {/* Toggle */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrors({});
              setPassword('');
              setConfirmPassword('');
            }}
            className="text-sm text-accent hover:underline"
          >
            {isLogin 
              ? 'Não tem conta? Cadastre-se' 
              : 'Já tem conta? Entre'}
          </button>
        </div>
      </div>
    </div>
  );
}
