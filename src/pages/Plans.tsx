import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';

type Plan = 'monthly' | 'annual';

interface CheckoutOptions {
  plan: Plan;
  coupon?: string;
}

export default function Plans() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { planType, daysLeftInTrial, hasFullAccess } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);

  const startCheckout = async ({ plan, coupon }: CheckoutOptions) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setLoadingPlan(plan);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan, coupon },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url as string;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao iniciar checkout';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Voltar
        </button>

        <header className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Escolha seu plano
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Continue com acesso completo a todas as funcionalidades para gerenciar suas finanças sem limites.
          </p>
          {planType === 'trial' && daysLeftInTrial !== null && (
            <p className="mt-4 text-sm text-accent font-semibold">
              {daysLeftInTrial > 0
                ? `Você ainda tem ${daysLeftInTrial} dia${daysLeftInTrial === 1 ? '' : 's'} de trial.`
                : 'Seu trial expirou.'}
            </p>
          )}
          {hasFullAccess && (planType === 'pro' || planType === 'annual' || planType === 'lifetime') && (
            <p className="mt-4 text-sm text-emerald-500 font-semibold">
              Você já é assinante {planType === 'lifetime' ? 'vitalício' : planType === 'annual' ? 'anual' : 'Pro'}.
            </p>
          )}
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Monthly */}
          <div className="rounded-2xl bg-card border border-border p-6 flex flex-col shadow-sm">
            <h2 className="text-lg font-bold text-foreground">Pro mensal</h2>
            <p className="text-muted-foreground text-sm mt-1">Flexibilidade total, cancele quando quiser.</p>
            <div className="mt-6">
              <span className="text-4xl font-bold text-foreground">R$ 19,90</span>
              <span className="text-muted-foreground text-sm">/mês</span>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-foreground/90 flex-1">
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-accent text-base">check</span> Acesso completo a todas as funcionalidades</li>
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-accent text-base">check</span> Cobrança mensal automática</li>
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-accent text-base">check</span> Suporte por e-mail</li>
            </ul>
            <button
              onClick={() => startCheckout({ plan: 'monthly' })}
              disabled={loadingPlan !== null}
              className="mt-6 w-full rounded-xl bg-card border border-accent text-accent font-bold py-3 hover:bg-accent/5 transition disabled:opacity-50"
            >
              {loadingPlan === 'monthly' ? 'Carregando...' : 'Assinar mensal'}
            </button>
          </div>

          {/* Annual */}
          <div className="relative rounded-2xl bg-card border-2 border-accent p-6 flex flex-col shadow-lg shadow-accent/10">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full">
              Melhor custo-benefício
            </span>
            <h2 className="text-lg font-bold text-foreground">Anual</h2>
            <p className="text-muted-foreground text-sm mt-1">Economize com a cobrança única anual.</p>
            <div className="mt-6">
              <span className="text-4xl font-bold text-foreground">R$ 159,00</span>
              <span className="text-muted-foreground text-sm">/ano</span>
              <p className="text-xs text-muted-foreground mt-1">
                Equivale a aprox. R$ 13,25/mês
              </p>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-foreground/90 flex-1">
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-accent text-base">check</span> Tudo do Pro mensal</li>
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-accent text-base">check</span> Economia de mais de 30%</li>
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-accent text-base">check</span> Cobrança única anual</li>
            </ul>
            <button
              onClick={() => startCheckout({ plan: 'annual' })}
              disabled={loadingPlan !== null}
              className="mt-6 w-full rounded-xl bg-accent text-accent-foreground font-bold py-3 hover:brightness-95 transition disabled:opacity-50"
            >
              {loadingPlan === 'annual' ? 'Carregando...' : 'Assinar anual'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Pagamento seguro via Stripe. Cancele a qualquer momento.
        </p>
      </div>
    </div>
  );
}