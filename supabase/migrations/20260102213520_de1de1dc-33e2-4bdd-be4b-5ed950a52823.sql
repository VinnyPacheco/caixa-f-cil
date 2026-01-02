-- Update the create_default_categories function to include new default categories
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- System categories "Outros" (cannot be deleted/edited)
  INSERT INTO public.categories (user_id, name, type, icon, color, is_system)
  VALUES (NEW.id, 'Outros', 'expense', 'more_horiz', '#64748B', true);
  
  INSERT INTO public.categories (user_id, name, type, icon, color, is_system)
  VALUES (NEW.id, 'Outros', 'income', 'more_horiz', '#64748B', true);
  
  -- Default expense categories (user can edit/delete)
  INSERT INTO public.categories (user_id, name, type, icon, color, is_system)
  VALUES 
    (NEW.id, 'Mercado', 'expense', 'shopping_cart', '#22C55E', false),
    (NEW.id, 'Moradia', 'expense', 'home', '#3B82F6', false),
    (NEW.id, 'Saúde', 'expense', 'favorite', '#EF4444', false),
    (NEW.id, 'Educação', 'expense', 'school', '#8B5CF6', false),
    (NEW.id, 'Transporte', 'expense', 'directions_car', '#F59E0B', false);
  
  -- Default income categories (user can edit/delete)
  INSERT INTO public.categories (user_id, name, type, icon, color, is_system)
  VALUES 
    (NEW.id, 'Salário', 'income', 'payments', '#10B981', false),
    (NEW.id, 'Renda extra', 'income', 'attach_money', '#06B6D4', false),
    (NEW.id, 'Investimento', 'income', 'trending_up', '#6366F1', false);
  
  RETURN NEW;
END;
$function$;

-- Insert default categories for existing users who don't have them yet
INSERT INTO public.categories (user_id, name, type, icon, color, is_system)
SELECT p.id, 'Mercado', 'expense', 'shopping_cart', '#22C55E', false
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.user_id = p.id AND c.name = 'Mercado' AND c.type = 'expense'
);

INSERT INTO public.categories (user_id, name, type, icon, color, is_system)
SELECT p.id, 'Moradia', 'expense', 'home', '#3B82F6', false
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.user_id = p.id AND c.name = 'Moradia' AND c.type = 'expense'
);

INSERT INTO public.categories (user_id, name, type, icon, color, is_system)
SELECT p.id, 'Saúde', 'expense', 'favorite', '#EF4444', false
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.user_id = p.id AND c.name = 'Saúde' AND c.type = 'expense'
);

INSERT INTO public.categories (user_id, name, type, icon, color, is_system)
SELECT p.id, 'Educação', 'expense', 'school', '#8B5CF6', false
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.user_id = p.id AND c.name = 'Educação' AND c.type = 'expense'
);

INSERT INTO public.categories (user_id, name, type, icon, color, is_system)
SELECT p.id, 'Transporte', 'expense', 'directions_car', '#F59E0B', false
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.user_id = p.id AND c.name = 'Transporte' AND c.type = 'expense'
);

INSERT INTO public.categories (user_id, name, type, icon, color, is_system)
SELECT p.id, 'Salário', 'income', 'payments', '#10B981', false
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.user_id = p.id AND c.name = 'Salário' AND c.type = 'income'
);

INSERT INTO public.categories (user_id, name, type, icon, color, is_system)
SELECT p.id, 'Renda extra', 'income', 'attach_money', '#06B6D4', false
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.user_id = p.id AND c.name = 'Renda extra' AND c.type = 'income'
);

INSERT INTO public.categories (user_id, name, type, icon, color, is_system)
SELECT p.id, 'Investimento', 'income', 'trending_up', '#6366F1', false
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.user_id = p.id AND c.name = 'Investimento' AND c.type = 'income'
);