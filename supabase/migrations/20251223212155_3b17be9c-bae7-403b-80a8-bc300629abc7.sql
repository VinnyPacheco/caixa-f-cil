-- Create function to create default account for new users
CREATE OR REPLACE FUNCTION public.create_default_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.accounts (user_id, name, type, initial_balance, is_primary, icon, color)
  VALUES (NEW.id, 'Banco', 'checking', 0, true, 'account_balance', '#6366F1');
  RETURN NEW;
END;
$$;

-- Create trigger to run after new user is created
CREATE TRIGGER on_auth_user_created_account
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_account();