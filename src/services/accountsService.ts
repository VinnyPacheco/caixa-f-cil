import { supabase } from '@/integrations/supabase/client';
import { Account, AccountType } from '@/types/finance';

export interface DbAccount {
  id: string;
  user_id: string;
  name: string;
  type: string;
  initial_balance: number;
  color: string;
  icon: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

// Convert database account to frontend account
export function dbToAccount(dbAccount: DbAccount): Account {
  return {
    id: dbAccount.id,
    name: dbAccount.name,
    type: dbAccount.type as AccountType,
    initialBalance: Number(dbAccount.initial_balance),
    color: dbAccount.color,
    icon: dbAccount.icon,
    isPrimary: dbAccount.is_primary,
  };
}

// Convert frontend account to database format
export function accountToDb(account: Omit<Account, 'id'>, userId: string) {
  return {
    user_id: userId,
    name: account.name,
    type: account.type as 'checking' | 'savings' | 'credit_card' | 'cash',
    initial_balance: account.initialBalance,
    color: account.color,
    icon: account.icon,
    is_primary: account.isPrimary ?? false,
  };
}

export async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(dbToAccount);
}

export async function createAccount(account: Omit<Account, 'id'>, userId: string): Promise<Account> {
  const { data, error } = await supabase
    .from('accounts')
    .insert([accountToDb(account, userId)])
    .select()
    .single();

  if (error) throw error;
  return dbToAccount(data);
}

export async function updateAccount(id: string, account: Partial<Omit<Account, 'id'>>): Promise<Account> {
  const updates: Record<string, unknown> = {};
  if (account.name !== undefined) updates.name = account.name;
  if (account.type !== undefined) updates.type = account.type;
  if (account.initialBalance !== undefined) updates.initial_balance = account.initialBalance;
  if (account.color !== undefined) updates.color = account.color;
  if (account.icon !== undefined) updates.icon = account.icon;
  if (account.isPrimary !== undefined) updates.is_primary = account.isPrimary;

  const { data, error } = await supabase
    .from('accounts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return dbToAccount(data);
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
