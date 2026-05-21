-- Add subscription columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS coupon_used boolean NOT NULL DEFAULT false;

-- Add a check constraint for plan_type allowed values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_plan_type_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_plan_type_check
      CHECK (plan_type IN ('trial', 'pro', 'annual', 'lifetime', 'free'));
  END IF;
END$$;

-- Backfill: existing users get trial of 21 days from now (if no trial_expires_at)
UPDATE public.profiles
SET trial_expires_at = now() + interval '21 days'
WHERE trial_expires_at IS NULL AND plan_type = 'trial';

-- Update handle_new_user to set trial defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, plan_type, trial_expires_at)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    'trial',
    now() + interval '21 days'
  );
  RETURN new;
END;
$function$;

-- Index to look up profile by stripe_customer_id from webhook
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON public.profiles (stripe_customer_id);