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
  end_date: string | null;
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
    endDate: dbTransaction.end_date ?? undefined,
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
    end_date: transaction.endDate ?? null,
  };
}

// Set end_date for a recurring transaction (for "this and future" deletion)
export async function setTransactionEndDate(id: string, endDate: string): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update({ end_date: endDate })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return dbToTransaction(data);
}

// Update the start_date for a recurring transaction (for "this and future" scenarios)
export async function setTransactionStartDate(id: string, startDate: string): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update({ start_date: startDate, date: startDate })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return dbToTransaction(data);
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

  // For installment transactions, create individual records for each installment
  if (transaction.recurrenceType === 'installment' && transaction.installmentTotal && transaction.installmentTotal > 1) {
    return createInstallmentTransactions(transaction, userId, maxOrderIndex);
  }

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

// Create individual records for each installment
async function createInstallmentTransactions(
  transaction: Omit<Transaction, 'id' | 'orderIndex'>,
  userId: string,
  baseOrderIndex: number
): Promise<Transaction> {
  const totalInstallments = transaction.installmentTotal!;
  const baseDate = new Date(transaction.date + 'T12:00:00');
  
  // Create the first installment (parent)
  const firstInstallmentData = {
    ...transactionToDb(transaction, userId),
    order_index: baseOrderIndex + 1,
    installment_current: 1,
    description: `${transaction.description} (1/${totalInstallments})`,
  };

  const { data: firstData, error: firstError } = await supabase
    .from('transactions')
    .insert([firstInstallmentData])
    .select()
    .single();

  if (firstError) throw firstError;

  const parentId = firstData.id;

  // Create remaining installments
  const remainingInstallments = [];
  for (let i = 2; i <= totalInstallments; i++) {
    const installmentDate = new Date(baseDate);
    installmentDate.setMonth(installmentDate.getMonth() + (i - 1));
    const dateStr = installmentDate.toISOString().split('T')[0];

    remainingInstallments.push({
      ...transactionToDb(transaction, userId),
      order_index: 1,
      parent_id: parentId,
      installment_current: i,
      date: dateStr,
      description: `${transaction.description} (${i}/${totalInstallments})`,
      is_paid: false, // Future installments start as unpaid
    });
  }

  if (remainingInstallments.length > 0) {
    const { error: batchError } = await supabase
      .from('transactions')
      .insert(remainingInstallments);

    if (batchError) throw batchError;
  }

  return dbToTransaction(firstData);
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
  // Execute all updates in parallel for better performance
  const promises = updates.map(update => {
    const updateData: { order_index: number; date?: string } = {
      order_index: update.orderIndex,
    };
    if (update.date) {
      updateData.date = update.date;
    }

    return supabase
      .from('transactions')
      .update(updateData)
      .eq('id', update.id);
  });

  const results = await Promise.all(promises);
  
  // Check for any errors
  const error = results.find(r => r.error)?.error;
  if (error) throw error;
}

// Delete a single installment
export async function deleteInstallment(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Delete this installment and all future installments (by date)
export async function deleteInstallmentAndFuture(
  id: string,
  parentId: string | null,
  fromDate: string
): Promise<void> {
  // Determine the series parent ID
  const seriesParentId = parentId || id;
  
  // If this is the first installment (parentId is null), delete all in the series
  if (!parentId) {
    // Delete the parent and all children
    const { error: deleteChildrenError } = await supabase
      .from('transactions')
      .delete()
      .eq('parent_id', id);
    
    if (deleteChildrenError) throw deleteChildrenError;

    const { error: deleteParentError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (deleteParentError) throw deleteParentError;
  } else {
    // Delete this record
    const { error: deleteThisError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    
    if (deleteThisError) throw deleteThisError;

    // Delete all siblings with same parent_id and date >= fromDate
    const { error: deleteFutureError } = await supabase
      .from('transactions')
      .delete()
      .eq('parent_id', seriesParentId)
      .gte('date', fromDate);

    if (deleteFutureError) throw deleteFutureError;
  }
}

// Delete all installments in a series
export async function deleteAllInstallments(
  id: string,
  parentId: string | null
): Promise<void> {
  // Determine the series parent ID
  const seriesParentId = parentId || id;
  
  // Delete all children first
  const { error: deleteChildrenError } = await supabase
    .from('transactions')
    .delete()
    .eq('parent_id', seriesParentId);

  if (deleteChildrenError) throw deleteChildrenError;

  // Delete the parent
  const { error: deleteParentError } = await supabase
    .from('transactions')
    .delete()
    .eq('id', seriesParentId);

  if (deleteParentError) throw deleteParentError;
}
