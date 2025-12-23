-- Create enums for account and transaction types
CREATE TYPE public.account_type AS ENUM ('checking', 'savings', 'credit_card', 'cash');
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');
CREATE TYPE public.recurrence_type AS ENUM ('once', 'installment', 'recurring');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create accounts table
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type account_type NOT NULL DEFAULT 'checking',
  initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6366F1',
  icon TEXT NOT NULL DEFAULT 'account_balance',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own accounts"
ON public.accounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own accounts"
ON public.accounts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
ON public.accounts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
ON public.accounts FOR DELETE
USING (auth.uid() = user_id);

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type transaction_type NOT NULL DEFAULT 'expense',
  icon TEXT NOT NULL DEFAULT 'category',
  color TEXT NOT NULL DEFAULT '#6366F1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own categories"
ON public.categories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories"
ON public.categories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
ON public.categories FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
ON public.categories FOR DELETE
USING (auth.uid() = user_id);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type transaction_type NOT NULL DEFAULT 'expense',
  is_paid BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  recurrence_type recurrence_type NOT NULL DEFAULT 'once',
  installment_current INTEGER,
  installment_total INTEGER,
  notes TEXT,
  auto_settle BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  start_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
ON public.transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
ON public.transactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
ON public.transactions FOR DELETE
USING (auth.uid() = user_id);

-- Create monthly_balances table for tracking opening/closing balances
CREATE TABLE public.monthly_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (account_id, year, month)
);

ALTER TABLE public.monthly_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own monthly balances"
ON public.monthly_balances FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own monthly balances"
ON public.monthly_balances FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly balances"
ON public.monthly_balances FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly balances"
ON public.monthly_balances FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_date ON public.transactions(date);
CREATE INDEX idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX idx_monthly_balances_user_id ON public.monthly_balances(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers to update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monthly_balances_updated_at
  BEFORE UPDATE ON public.monthly_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();