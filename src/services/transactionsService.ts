import { supabase } from '@/integrations/supabase/client';
import { Transaction, RecurrenceType, TransactionType } from '@/types/finance';

export interface DbTransaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  description: string;
  amount: number;
  date: string;
  type: string;
  is_paid: boolean;
  order_index: number;
  recurrence_type: string;
  installment_current: number | null;
  installment_total: number | null;
  notes: string | null;
  auto_settle: boolean | null;
  parent_id: string | null;
  start_date: string | null;
  created_at: string;
  updated_at: string;
}

// Convert database transaction to frontend transaction
export function dbToTransaction(dbTransaction: DbTransaction): Transaction {
  return {
    id: dbTransaction.id,
    accountId: dbTransaction.account_id,
    categoryId: dbTransaction.category_id,
    description: dbTransaction.description,
    amount: Number(dbTransaction.amount),
    date: dbTransaction.date,
    type: dbTransaction.type as TransactionType,
    isPaid: dbTransaction.is_paid,
    orderIndex: dbTransaction.order_index,
    recurrenceType: dbTransaction.recurrence_type as RecurrenceType,
    installmentCurrent: dbTransaction.installment_current ?? undefined,
    installmentTotal: dbTransaction.installment_total ?? undefined,
    notes: dbTransaction.notes ?? undefined,
    autoSettle: dbTransaction.auto_settle ?? undefined,
    parentId: dbTransaction.parent_id ?? undefined,
    startDate: dbTransaction.start_date ?? undefined,
  };
}

// Convert frontend transaction to database format
export function transactionToDb(
  transaction: Omit<Transaction, 'id' | 'orderIndex'>,
  userId: string
) {
  return {
    user_id: userId,
    account_id: transaction.accountId,
    category_id: transaction.categoryId,
    description: transaction.description,
    amount: transaction.amount,
    date: transaction.date,
    type: transaction.type as 'income' | 'expense',
    is_paid: transaction.isPaid,
    recurrence_type: transaction.recurrenceType as 'once' | 'installment' | 'recurring',
    installment_current: transaction.installmentCurrent ?? null,
    installment_total: transaction.installmentTotal ?? null,
    notes: transaction.notes ?? null,
    auto_settle: transaction.autoSettle ?? null,
    parent_id: transaction.parentId ?? null,
    start_date: transaction.startDate ?? null,
  };
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
    .order('order_index', { ascending: true });

  if (error) throw error;
  return (data || []).map(dbToTransaction);
}

export async function fetchTransactionsByDateRange(
  startDate: string,
  endDate: string
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('order_index', { ascending: true });

  if (error) throw error;
  return (data || []).map(dbToTransaction);
}

export async function createTransaction(
  transaction: Omit<Transaction, 'id' | 'orderIndex'>,
  userId: string
): Promise<Transaction> {
  // Get max order_index for the date
  const { data: maxData } = await supabase
    .from('transactions')
    .select('order_index')
    .eq('date', transaction.date)
    .eq('user_id', userId)
    .order('order_index', { ascending: false })
    .limit(1);

  const maxOrderIndex = maxData?.[0]?.order_index ?? 0;

  const insertData = {
    ...transactionToDb(transaction, userId),
    order_index: maxOrderIndex + 1,
  };

  const { data, error } = await supabase
    .from('transactions')
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;
  return dbToTransaction(data);
}

export async function updateTransaction(
  id: string,
  transaction: Partial<Omit<Transaction, 'id'>>
): Promise<Transaction> {
  const updates: Record<string, unknown> = {};
  
  if (transaction.accountId !== undefined) updates.account_id = transaction.accountId;
  if (transaction.categoryId !== undefined) updates.category_id = transaction.categoryId;
  if (transaction.description !== undefined) updates.description = transaction.description;
  if (transaction.amount !== undefined) updates.amount = transaction.amount;
  if (transaction.date !== undefined) updates.date = transaction.date;
  if (transaction.type !== undefined) updates.type = transaction.type;
  if (transaction.isPaid !== undefined) updates.is_paid = transaction.isPaid;
  if (transaction.orderIndex !== undefined) updates.order_index = transaction.orderIndex;
  if (transaction.recurrenceType !== undefined) updates.recurrence_type = transaction.recurrenceType;
  if (transaction.installmentCurrent !== undefined) updates.installment_current = transaction.installmentCurrent;
  if (transaction.installmentTotal !== undefined) updates.installment_total = transaction.installmentTotal;
  if (transaction.notes !== undefined) updates.notes = transaction.notes;
  if (transaction.autoSettle !== undefined) updates.auto_settle = transaction.autoSettle;
  if (transaction.parentId !== undefined) updates.parent_id = transaction.parentId;
  if (transaction.startDate !== undefined) updates.start_date = transaction.startDate;

  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return dbToTransaction(data);
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function toggleTransactionPaid(id: string, isPaid: boolean): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update({ is_paid: isPaid })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return dbToTransaction(data);
}

export async function reorderTransactions(
  updates: { id: string; orderIndex: number; date?: string }[]
): Promise<void> {
  for (const update of updates) {
    const updateData: { order_index: number; date?: string } = {
      order_index: update.orderIndex,
    };
    if (update.date) {
      updateData.date = update.date;
    }

    const { error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', update.id);

    if (error) throw error;
  }
}
