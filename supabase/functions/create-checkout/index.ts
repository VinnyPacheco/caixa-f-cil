import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COUPON_CODE = 'PRIMEIROMES';
const COUPON_ID = Deno.env.get('STRIPE_COUPON_ID') ?? COUPON_CODE;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const plan = body.plan as 'monthly' | 'annual';
    const requestedCoupon = body.coupon as string | undefined;

    if (plan !== 'monthly' && plan !== 'annual') {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const priceId = plan === 'monthly'
      ? Deno.env.get('STRIPE_PRICE_ID_MONTHLY')
      : Deno.env.get('STRIPE_PRICE_ID_ANNUAL');
    if (!priceId) throw new Error('Stripe price ID not configured');

    // Use service role to read coupon_used / stripe_subscription_id
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('coupon_used, stripe_subscription_id, stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    // Coupon eligibility: only monthly, only if requested PRIMEIROMES, only if not used and no prior subscription
    const couponEligible =
      plan === 'monthly' &&
      requestedCoupon?.toUpperCase() === COUPON_CODE &&
      !profile?.coupon_used &&
      !profile?.stripe_subscription_id;

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });

    // Reuse customer if exists, else create
    let customerId = profile?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const existing = await stripe.customers.list({ email: user.email!, limit: 1 });
      customerId = existing.data[0]?.id;
    }

    const origin = req.headers.get('origin') ?? 'https://vp-finance.lovable.app';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      discounts: couponEligible ? [{ coupon: COUPON_ID }] : undefined,
      success_url: `${origin}/?subscription=success`,
      cancel_url: `${origin}/planos?canceled=1`,
      metadata: {
        user_id: user.id,
        plan,
        coupon_applied: couponEligible ? COUPON_CODE : '',
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan,
        },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('create-checkout error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});