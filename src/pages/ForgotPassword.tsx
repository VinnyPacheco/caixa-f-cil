import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const emailSchema = z.string().trim().email('Email inválido');

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }
    setIsLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    if (err) {
      toast({
        title: 'Erro ao enviar email',
        description: err.message,
        variant: 'destructive',
      });
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="size-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-accent text-3xl">
              lock_reset
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Esqueci minha senha
          </h1>
          <p className="text-muted-foreground">
            {sent
              ? 'Enviamos um link para o seu email.'
              : 'Informe seu email para receber o link de redefinição'}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={error ? 'border-destructive' : ''}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Enviando...' : 'Enviar link'}
            </Button>
          </form>
        ) : (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground text-center">
            Verifique sua caixa de entrada e clique no link para redefinir sua senha.
            O link expira em alguns minutos.
          </div>
        )}

        <div className="text-center">
          <Link to="/auth" className="text-sm text-accent hover:underline">
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
