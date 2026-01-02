import { supabase } from '@/integrations/supabase/client';

export interface RecurringException {
  id: string;
  parentId: string;
  exceptionDate: string;
  exceptionType: 'skip' | 'modified';
  modifiedAmount?: number;
  modifiedDescription?: string;
  modifiedCategoryId?: string;
  modifiedAccountId?: string;
  modifiedIsPaid?: boolean;
  modifiedNotes?: string;
}

interface DbRecurringException {
  id: string;
  user_id: string;
  parent_id: string;
  exception_date: string;
  exception_type: string;
  modified_amount: number | null;
  modified_description: string | null;
  modified_category_id: string | null;
  modified_account_id: string | null;
  modified_is_paid: boolean | null;
  modified_notes: string | null;
  created_at: string;
  updated_at: string;
}

function dbToException(db: DbRecurringException): RecurringException {
  return {
    id: db.id,
    parentId: db.parent_id,
    exceptionDate: db.exception_date,
    exceptionType: db.exception_type as 'skip' | 'modified',
    modifiedAmount: db.modified_amount ?? undefined,
    modifiedDescription: db.modified_description ?? undefined,
    modifiedCategoryId: db.modified_category_id ?? undefined,
    modifiedAccountId: db.modified_account_id ?? undefined,
    modifiedIsPaid: db.modified_is_paid ?? undefined,
    modifiedNotes: db.modified_notes ?? undefined,
  };
}

export async function fetchRecurringExceptions(): Promise<RecurringException[]> {
  const { data, error } = await supabase
    .from('recurring_exceptions')
    .select('*');

  if (error) throw error;
  return (data || []).map(dbToException);
}

export async function createRecurringException(
  exception: Omit<RecurringException, 'id'>,
  userId: string
): Promise<RecurringException> {
  const { data, error } = await supabase
    .from('recurring_exceptions')
    .insert([{
      user_id: userId,
      parent_id: exception.parentId,
      exception_date: exception.exceptionDate,
      exception_type: exception.exceptionType,
      modified_amount: exception.modifiedAmount ?? null,
      modified_description: exception.modifiedDescription ?? null,
      modified_category_id: exception.modifiedCategoryId ?? null,
      modified_account_id: exception.modifiedAccountId ?? null,
      modified_is_paid: exception.modifiedIsPaid ?? null,
      modified_notes: exception.modifiedNotes ?? null,
    }])
    .select()
    .single();

  if (error) throw error;
  return dbToException(data);
}

export async function deleteRecurringException(id: string): Promise<void> {
  const { error } = await supabase
    .from('recurring_exceptions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function deleteExceptionsByParentId(parentId: string): Promise<void> {
  const { error } = await supabase
    .from('recurring_exceptions')
    .delete()
    .eq('parent_id', parentId);

  if (error) throw error;
}

// Create skip exceptions for all dates from startDate onwards
export async function createSkipExceptionsFromDate(
  parentId: string,
  startDate: string,
  userId: string
): Promise<void> {
  // For "this and future", we'll set end_date on the transaction instead
  // This is handled in the transactionsService
}

// Create skip exceptions for past dates only
export async function createSkipExceptionsBeforeDate(
  parentId: string,
  beforeDate: string,
  userId: string,
  transactionStartDate: string
): Promise<void> {
  // Generate all dates from transaction start to beforeDate
  const startDateObj = new Date(transactionStartDate);
  const endDateObj = new Date(beforeDate);
  
  const exceptions: Array<{
    user_id: string;
    parent_id: string;
    exception_date: string;
    exception_type: string;
  }> = [];
  
  const current = new Date(startDateObj);
  while (current < endDateObj) {
    exceptions.push({
      user_id: userId,
      parent_id: parentId,
      exception_date: current.toISOString().split('T')[0],
      exception_type: 'skip',
    });
    current.setMonth(current.getMonth() + 1);
  }
  
  if (exceptions.length > 0) {
    const { error } = await supabase
      .from('recurring_exceptions')
      .upsert(exceptions, { onConflict: 'parent_id,exception_date' });
    
    if (error) throw error;
  }
}
