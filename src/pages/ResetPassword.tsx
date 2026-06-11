import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Check, X } from 'lucide-react';

const passwordCriteria = [
  { id: 'minLength', label: 'Pelo menos 8 caracteres', test: (pw: string) => pw.length >= 8 },
  { id: 'lowercase', label: 'Uma letra minúscula', test: (pw: string) => /[a-z]/.test(pw) },
  { id: 'uppercase', label: 'Uma letra maiúscula', test: (pw: string) => /[A-Z]/.test(pw) },
  { id: 'number', label: 'Um número', test: (pw: string) => /[0-9]/.test(pw) },
  { id: 'special', label: 'Um caractere especial (!@#$%...)', test: (pw: string) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(pw) },
];

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Supabase parses the recovery token from the URL hash automatically.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        setHasRecoverySession(true);
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasRecoverySession(true);
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const passwordStrength = useMemo(
    () => passwordCriteria.map(c => ({ ...c, met: c.test(password) })),
    [password]
  );
  const allCriteriaMet = passwordStrength.every(c => c.met);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allCriteriaMet) {
      toast({ title: 'Senha fraca', description: 'A senha não cumpre todos os critérios.', variant: 'destructive' });
      return;
    }
    if (!passwordsMatch) {
      toast({ title: 'Senhas não coincidem', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) {
      toast({ title: 'Erro ao redefinir senha', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Senha redefinida com sucesso!', description: 'Você já pode usar a nova senha.' });
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="size-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasRecoverySession) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="size-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-destructive text-3xl">error</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Link inválido ou expirado</h1>
          <p className="text-muted-foreground">
            Solicite um novo link de redefinição de senha.
          </p>
          <Button onClick={() => navigate('/forgot-password')} className="w-full">
            Solicitar novo link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="size-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-accent text-3xl">key</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Redefinir senha</h1>
          <p className="text-muted-foreground">Crie uma nova senha para sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {password.length > 0 && (
              <div className="grid gap-1.5 pt-2 animate-in fade-in-0 duration-200">
                {passwordStrength.map((c) => (
                  <div key={c.id} className={`flex items-center gap-2 text-xs transition-all ${c.met ? 'text-green-500' : 'text-muted-foreground'}`}>
                    <div className={`size-4 rounded-full flex items-center justify-center ${c.met ? 'bg-green-500/20' : 'bg-muted'}`}>
                      {c.met ? <Check className="size-3" /> : <X className="size-3" />}
                    </div>
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {confirmPassword.length > 0 && passwordsMatch && (
              <div className="flex items-center gap-2 text-xs text-green-500">
                <Check className="size-3" />
                <span>Senhas coincidem</span>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !allCriteriaMet || !passwordsMatch}>
            {isLoading ? 'Redefinindo...' : 'Redefinir senha'}
          </Button>
        </form>
      </div>
    </div>
  );
}
