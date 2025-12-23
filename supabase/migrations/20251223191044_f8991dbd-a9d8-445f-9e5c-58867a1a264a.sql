-- Add is_primary column to accounts table
ALTER TABLE public.accounts ADD COLUMN is_primary boolean NOT NULL DEFAULT false;

-- Create function to ensure only one primary account per user
CREATE OR REPLACE FUNCTION public.ensure_single_primary_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If the new/updated account is being set as primary
  IF NEW.is_primary = true THEN
    -- Set all other accounts for this user to not primary
    UPDATE public.accounts 
    SET is_primary = false 
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_primary = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce single primary account
CREATE TRIGGER ensure_single_primary_account_trigger
BEFORE INSERT OR UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_primary_account();