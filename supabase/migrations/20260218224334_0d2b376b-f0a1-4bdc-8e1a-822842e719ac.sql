
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS due_day integer,
  ADD COLUMN IF NOT EXISTS statement_closing_day integer,
  ADD COLUMN IF NOT EXISTS credit_limit numeric;
