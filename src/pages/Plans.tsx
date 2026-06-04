import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';

type Plan = 'monthly' | 'annual';

const BENEFITS = [
  'Lançamentos ilimitados',
  'Relatórios mensais completos',
  'Controle por categorias',
  'Metas financeiras',
  'Acesso em todos os dispositivos',
];

const TESTIMONIALS = [
  {
    quote:
      'Finalmente entendo para onde vai cada real. Sinto que estou no controle da minha vida financeira — e isso é uma sensação incrível.',
    author: 'Ana Paula, 34 anos',
  },
  {
    quote:
      'Em três meses conseguimos realizar a viagem de férias que planejávamos há tempo. Ter clareza nos números fez toda a diferença.',
    author: 'Carlos e Renata, SP',
  },
  {
    quote:
      'É a assinatura que mais faz sentido no meu dia a dia. Me ajuda a tomar decisões melhores todo mês.',
    author: 'Thiago M., 29 anos',
  },
];

function formatDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

export default function Plans() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { planType, daysLeftInTrial, isTrialExpired, isLoading: subLoading } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [couponEligible, setCouponEligible] = useState(false);

  const couponParam = params.get('coupon')?.toUpperCase();
  const requestingCoupon = couponParam === 'PRIMEIROMES';

  const isSubscriber = planType === 'pro' || planType === 'annual';
  const isLifetime = planType === 'lifetime';

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('coupon_used, stripe_subscription_id')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        setCouponEligible(
          requestingCoupon && !data.coupon_used && !data.stripe_subscription_id,
        );
      }
    })();
  }, [user?.id, requestingCoupon]);

  const startCheckout = async (plan: Plan) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setLoadingPlan(plan);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan, coupon: plan === 'monthly' && couponEligible ? 'PRIMEIROMES' : undefined },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url as string;
      else throw new Error('URL de checkout não retornada');
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao iniciar checkout',
        variant: 'destructive',
      });
      setLoadingPlan(null);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', { body: {} });
      if (error) throw error;
      if (data?.url) window.location.href = data.url as string;
      else throw new Error('URL do portal não retornada');
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao abrir portal',
        variant: 'destructive',
      });
      setPortalLoading(false);
    }
  };

  const monthlyBtnLabel =
    loadingPlan === 'monthly'
      ? 'Carregando...'
      : couponEligible
        ? 'Começar por R$9,90 no primeiro mês'
        : 'Assinar por R$19,90/mês';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Voltar
        </button>

        {/* Trial banner */}
        {!subLoading && planType === 'trial' && (
          <div
            className={`mb-8 rounded-2xl p-4 text-center text-sm font-medium ${
              isTrialExpired
                ? 'bg-destructive/10 text-destructive border border-destructive/30'
                : 'bg-accent/10 text-foreground border border-accent/30'
            }`}
          >
            {isTrialExpired
              ? 'Seu trial encerrou. Assine agora para recuperar o acesso completo.'
              : `Seu trial termina em ${daysLeftInTrial} ${daysLeftInTrial === 1 ? 'dia' : 'dias'}. Garanta seu plano e continue sem interrupção.`}
          </div>
        )}

        {/* Lifetime user */}
        {isLifetime && (
          <section className="rounded-2xl bg-card border border-border p-8 text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">Acesso vitalício</h2>
            <p className="text-muted-foreground">
              Você possui acesso vitalício ao Finlar. Obrigado por fazer parte desde o início. 💚
            </p>
          </section>
        )}

        {/* Active subscriber: only management section */}
        {isSubscriber && !isLifetime && (
          <section className="rounded-2xl bg-card border border-border p-6 sm:p-8">
            <h2 className="text-xl font-bold text-foreground mb-1">Seu plano atual</h2>
            <p className="text-muted-foreground text-sm mb-6">
              {planType === 'annual' ? 'Pro Anual' : 'Pro Mensal'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="flex-1 rounded-xl bg-accent text-accent-foreground font-bold py-3 hover:brightness-95 transition disabled:opacity-50"
              >
                {portalLoading ? 'Abrindo...' : 'Alterar plano'}
              </button>
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="flex-1 rounded-xl bg-card border border-border text-foreground font-semibold py-3 hover:bg-muted/50 transition disabled:opacity-50"
              >
                Cancelar assinatura
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              O cancelamento é feito pelo portal seguro do Stripe. Você continua com acesso até o fim do
              período já pago.
            </p>
          </section>
        )}

        {/* Acquisition flow: hero + cards + social proof + guarantee */}
        {!isSubscriber && !isLifetime && (
          <>
            {/* HERO */}
            <header className="text-center mb-12 mt-4">
              <h1 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight leading-tight">
                Você já sabe para onde seu dinheiro vai?
              </h1>
              <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-base md:text-lg">
                Com o Finlar, você vê tudo de forma ampla e decide com calma, para tomar as melhores decisões.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
                {[
                  { emoji: '🧘', text: 'Mais leveza para lidar com o dinheiro' },
                  { emoji: '📊', text: 'Clareza total das suas finanças' },
                  { emoji: '🎯', text: 'Metas que a família realmente conquista' },
                ].map((item) => (
                  <div key={item.text} className="flex flex-col items-center gap-2 px-4">
                    <span className="text-3xl" aria-hidden>{item.emoji}</span>
                    <p className="text-sm text-foreground/80">{item.text}</p>
                  </div>
                ))}
              </div>
            </header>

            {/* CARDS */}
            <div className="grid gap-5 md:grid-cols-2 mt-4">
              {/* Monthly */}
              <div className="rounded-2xl bg-card border border-border p-6 flex flex-col shadow-sm">
                <h2 className="text-lg font-bold text-foreground">Pro</h2>
                <p className="text-muted-foreground text-sm mt-1">Cancele quando quiser</p>
                <div className="mt-6">
                  <span className="text-4xl font-bold text-foreground">R$ 19,90</span>
                  <span className="text-muted-foreground text-sm">/mês</span>
                </div>
                <ul className="mt-6 space-y-2 text-sm text-foreground/90 flex-1">
                  {BENEFITS.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-accent text-base mt-0.5">check</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => startCheckout('monthly')}
                  disabled={loadingPlan !== null}
                  className="mt-6 w-full rounded-xl bg-card border border-accent text-accent font-bold py-3 hover:bg-accent/5 transition disabled:opacity-50"
                >
                  {monthlyBtnLabel}
                </button>
                {couponEligible && (
                  <p className="text-xs text-center text-accent mt-2">
                    Cupom PRIMEIROMES aplicado no primeiro mês.
                  </p>
                )}
              </div>

              {/* Annual */}
              <div className="relative rounded-2xl bg-accent/5 border-2 border-accent p-6 flex flex-col shadow-lg shadow-accent/10">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full">
                  Mais escolhido
                </span>
                <h2 className="text-lg font-bold text-foreground">Pro Anual</h2>
                <p className="text-muted-foreground text-sm mt-1">Pague uma vez, use o ano todo</p>
                <div className="mt-6">
                  <span className="text-4xl font-bold text-foreground">R$ 159,00</span>
                  <span className="text-muted-foreground text-sm">/ano</span>
                  <p className="text-xs text-accent font-semibold mt-1">
                    Equivale a R$13,25/mês — você economiza R$80 por ano
                  </p>
                </div>
                <ul className="mt-6 space-y-2 text-sm text-foreground/90 flex-1">
                  {BENEFITS.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-accent text-base mt-0.5">check</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => startCheckout('annual')}
                  disabled={loadingPlan !== null}
                  className="mt-6 w-full rounded-xl bg-accent text-accent-foreground font-bold py-3 hover:brightness-95 transition disabled:opacity-50"
                >
                  {loadingPlan === 'annual' ? 'Carregando...' : 'Assinar por R$159,00/ano'}
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-6">
              🔒 Pagamento seguro via Stripe. Seus dados bancários nunca passam pelo Finlar.
            </p>

            {/* SOCIAL PROOF */}
            <section className="mt-16">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center">
                O que muda quando você assina o Finlar
              </h2>
              <div className="grid gap-5 md:grid-cols-3 mt-8">
                {TESTIMONIALS.map((t) => (
                  <figure
                    key={t.author}
                    className="rounded-2xl bg-card border border-border p-6 flex flex-col gap-4"
                  >
                    <blockquote className="text-sm text-foreground/90 leading-relaxed">
                      “{t.quote}”
                    </blockquote>
                    <figcaption className="text-xs text-muted-foreground font-medium">
                      — {t.author}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>

            {/* GUARANTEE */}
            <section className="mt-16 rounded-2xl bg-muted/40 border border-border p-6 sm:p-8">
              <h2 className="text-xl md:text-2xl font-bold text-foreground text-center">
                Sem risco. Sem burocracia.
              </h2>
              <ul className="mt-6 space-y-3 max-w-xl mx-auto">
                {[
                  'Trial de 21 dias grátis — sem cartão de crédito',
                  'Cancele online a qualquer momento, sem ligar para ninguém',
                  'Seus dados ficam salvos por 30 dias após o cancelamento',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground/90">
                    <span className="material-symbols-outlined text-accent text-base mt-0.5">check</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-center text-base md:text-lg font-semibold text-foreground max-w-2xl mx-auto leading-relaxed">
                Com o Finlar, você ganha clareza, confiança e tranquilidade para cuidar bem do seu dinheiro
                todo mês.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}