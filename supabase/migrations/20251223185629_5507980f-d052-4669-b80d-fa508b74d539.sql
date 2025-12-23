-- Add is_system column to categories table
ALTER TABLE public.categories ADD COLUMN is_system boolean NOT NULL DEFAULT false;

-- Create a function to prevent deletion/update of system categories
CREATE OR REPLACE FUNCTION public.prevent_system_category_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_system = true THEN
      RAISE EXCEPTION 'Cannot delete system category';
    END IF;
    RETURN OLD;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_system = true THEN
      RAISE EXCEPTION 'Cannot update system category';
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to prevent modification of system categories
CREATE TRIGGER prevent_system_category_modification_trigger
BEFORE UPDATE OR DELETE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.prevent_system_category_modification();

-- Create function to create default "Outros" categories for new users
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create "Outros" category for expenses
  INSERT INTO public.categories (user_id, name, type, icon, color, is_system)
  VALUES (NEW.id, 'Outros', 'expense', 'more_horiz', '#64748B', true);
  
  -- Create "Outros" category for income
  INSERT INTO public.categories (user_id, name, type, icon, color, is_system)
  VALUES (NEW.id, 'Outros', 'income', 'more_horiz', '#64748B', true);
  
  RETURN NEW;
END;
$$;

-- Create trigger to create default categories when a new user signs up
CREATE TRIGGER on_auth_user_created_categories
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_default_categories();