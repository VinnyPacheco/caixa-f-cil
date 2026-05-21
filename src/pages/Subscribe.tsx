import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

/**
 * /assinar?coupon=PRIMEIROMES
 * Auto-starts a monthly checkout. Includes the coupon only if eligibility is met
 * (validated server-side inside the create-checkout edge function).
 */
export default function Subscribe() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const started = useRef(false);

  useEffect(() => {
    if (isLoading || started.current) return;
    if (!user) {
      const coupon = params.get('coupon') ?? '';
      navigate(`/auth?redirect=${encodeURIComponent(`/assinar?coupon=${coupon}`)}`);
      return;
    }
    started.current = true;

    const coupon = params.get('coupon') ?? undefined;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { plan: 'monthly', coupon },
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
        navigate('/planos');
      }
    })();
  }, [user, isLoading, params, navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Preparando seu checkout...</p>
      </div>
    </div>
  );
}