import { supabase } from '@/integrations/supabase/client';
import { Category, TransactionType } from '@/types/finance';

export interface DbCategory {
  id: string;
  user_id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

// Convert database category to frontend category
export function dbToCategory(dbCategory: DbCategory): Category {
  return {
    id: dbCategory.id,
    name: dbCategory.name,
    type: dbCategory.type as TransactionType,
    icon: dbCategory.icon,
    color: dbCategory.color,
    isSystem: dbCategory.is_system,
  };
}

// Convert frontend category to database format
export function categoryToDb(category: Omit<Category, 'id'>, userId: string) {
  return {
    user_id: userId,
    name: category.name,
    type: category.type as 'income' | 'expense',
    icon: category.icon,
    color: category.color,
  };
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(dbToCategory);
}

export async function createCategory(category: Omit<Category, 'id'>, userId: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert([categoryToDb(category, userId)])
    .select()
    .single();

  if (error) throw error;
  return dbToCategory(data);
}

export async function updateCategory(id: string, category: Partial<Omit<Category, 'id'>>): Promise<Category> {
  const updates: Record<string, unknown> = {};
  if (category.name !== undefined) updates.name = category.name;
  if (category.type !== undefined) updates.type = category.type;
  if (category.icon !== undefined) updates.icon = category.icon;
  if (category.color !== undefined) updates.color = category.color;

  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return dbToCategory(data);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
