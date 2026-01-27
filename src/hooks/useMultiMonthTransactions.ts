import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Transaction, TransactionWithBalance, Category, Account, MonthSummary } from '@/types/finance';
import { 
  fetchTransactions, 
  createTransaction, 
  updateTransaction,
  deleteTransaction,
  toggleTransactionPaid,
  reorderTransactions as reorderTransactionsService,
  setTransactionEndDate,
} from '@/services/transactionsService';
import { 
  createRecurringException,
  fetchRecurringExceptions,
  RecurringException,
} from '@/services/recurringExceptionsService';
import { fetchAccounts } from '@/services/accountsService';
import { fetchCategories } from '@/services/categoriesService';
import { setTransactionTags } from '@/services/tagsService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { calculateRunningBalances } from '@/lib/format';
import { FilterType } from '@/components/finance/FilterPills';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, addMonths, isBefore, isAfter } from 'date-fns';
import { useState } from 'react';
import { RecurringUpdateAction } from '@/components/finance/TransactionForm';

// Helper function to expand transactions for a specific month
function expandTransactionsForMonth(
  transactions: Transaction[],
  targetDate: Date,
  categories: Category[],
  accounts: Account[],
  openingBalance: number
): TransactionWithBalance[] {
  const start = startOfMonth(targetDate);
  const end = endOfMonth(targetDate);
  const result: Transaction[] = [];

  transactions.forEach((t) => {
    const transactionDate = parseISO(t.date);
    const transactionStartDate = t.startDate ? parseISO(t.startDate) : transactionDate;
    
    if (t.recurrenceType === 'once') {
      if (isWithinInterval(transactionDate, { start, end })) {
        result.push(t);
      }
      return;
    }

    if (t.recurrenceType === 'recurring') {
      const dayOfMonth = transactionStartDate.getDate();
      const instanceDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), dayOfMonth);
      const transactionEndDate = t.endDate ? parseISO(t.endDate) : null;
      
      // Check if this instance is within valid range (after start, before end)
      if (!isAfter(transactionStartDate, end)) {
        // If the original transaction date is in this month, use it
        if (isWithinInterval(transactionDate, { start, end })) {
          result.push(t);
        } 
        // Otherwise, generate a virtual instance if within start/end bounds
        else if (!isBefore(instanceDate, transactionStartDate) && 
                 (!transactionEndDate || isBefore(instanceDate, transactionEndDate))) {
          const instanceId = `${t.parentId || t.id}-${format(instanceDate, 'yyyy-MM')}`;
          result.push({
            ...t,
            id: instanceId,
            parentId: t.parentId || t.id,
            date: format(instanceDate, 'yyyy-MM-dd'),
            isPaid: false,
          });
        }
      }
      return;
    }

    if (t.recurrenceType === 'installment' && t.installmentTotal) {
      const totalInstallments = t.installmentTotal;
      
      for (let i = 0; i < totalInstallments; i++) {
        const installmentDate = addMonths(transactionStartDate, i);
        
        if (isWithinInterval(installmentDate, { start, end })) {
          const instanceId = i === 0 ? t.id : `${t.parentId || t.id}-inst-${i + 1}`;
          result.push({
            ...t,
            id: instanceId,
            parentId: t.parentId || t.id,
            date: format(installmentDate, 'yyyy-MM-dd'),
            installmentCurrent: i + 1,
            isPaid: i === 0 ? t.isPaid : false,
            description: `${t.description} (${i + 1}/${totalInstallments})`,
          });
        }
      }
    }
  });

  // Add category and account info
  const withRelations = result.map((t) => ({
    ...t,
    category: categories.find((c) => c.id === t.categoryId),
    account: accounts.find((a) => a.id === t.accountId),
    runningBalance: 0,
  }));

  return calculateRunningBalances(withRelations, openingBalance);
}

export interface MonthData {
  date: Date;
  label: string;
  transactions: TransactionWithBalance[];
  summary: MonthSummary;
}

export function useMultiMonthTransactions(selectedDate: Date, additionalMonths: number) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');

  // Fetch all data from Supabase
  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    enabled: !!user,
  });

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    enabled: !!user,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: !!user,
  });

  const transactions = transactionsQuery.data || [];
  const accounts = accountsQuery.data || [];
  const categories = categoriesQuery.data || [];

  // Calculate opening balance from accounts
  const openingBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
  }, [accounts]);

  // Helper to calculate month summary (income, expense, opening/closing balance)
  const calculateMonthSummary = useCallback((
    monthDate: Date,
    monthOpeningBalance: number
  ): { expanded: TransactionWithBalance[]; summary: MonthSummary } => {
    const expanded = expandTransactionsForMonth(transactions, monthDate, categories, accounts, monthOpeningBalance);
    
    const totalIncome = expanded
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = expanded
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const closingBalance = monthOpeningBalance + totalIncome - totalExpense;

    return {
      expanded,
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        openingBalance: monthOpeningBalance,
        closingBalance,
      },
    };
  }, [transactions, categories, accounts]);

  // Generate data for multiple months with cascading balances
  const monthsData = useMemo(() => {
    const result: MonthData[] = [];
    
    // First, calculate the opening balance for the selected month
    // by computing all previous months from the account initial balance
    let currentOpeningBalance = openingBalance;
    
    // Calculate balance from the beginning of time until the selected month
    // We need to process all transactions before the selected month
    const selectedMonthStart = startOfMonth(selectedDate);
    
    // Get all transactions before selected month and calculate their impact
    // For 'once' transactions, we simply check if the date is before the selected month
    // For recurring/installment, we need to expand and count each instance
    transactions.forEach((t) => {
      const transactionDate = parseISO(t.date);
      const transactionStartDate = t.startDate ? parseISO(t.startDate) : transactionDate;
      const transactionEndDate = t.endDate ? parseISO(t.endDate) : null;
      
      if (t.recurrenceType === 'once') {
        if (isBefore(transactionDate, selectedMonthStart)) {
          currentOpeningBalance += t.type === 'income' ? t.amount : -t.amount;
        }
      } else if (t.recurrenceType === 'recurring') {
        // Count all instances before selected month, respecting end_date
        const dayOfMonth = transactionStartDate.getDate();
        let instanceDate = new Date(transactionStartDate.getFullYear(), transactionStartDate.getMonth(), dayOfMonth);
        
        while (isBefore(instanceDate, selectedMonthStart)) {
          // Check if instance is after start date and before end date (if any)
          if (!isBefore(instanceDate, transactionStartDate)) {
            if (!transactionEndDate || isBefore(instanceDate, transactionEndDate)) {
              currentOpeningBalance += t.type === 'income' ? t.amount : -t.amount;
            }
          }
          instanceDate = addMonths(instanceDate, 1);
        }
      } else if (t.recurrenceType === 'installment' && t.installmentTotal) {
        // Count all installments before selected month
        for (let i = 0; i < t.installmentTotal; i++) {
          const installmentDate = addMonths(transactionStartDate, i);
          if (isBefore(installmentDate, selectedMonthStart)) {
            currentOpeningBalance += t.type === 'income' ? t.amount : -t.amount;
          }
        }
      }
    });

    // Now generate data for selected month and additional months
    for (let i = 0; i <= additionalMonths; i++) {
      const monthDate = addMonths(selectedDate, i);
      const monthOpeningBalance = i === 0 ? currentOpeningBalance : result[i - 1].summary.closingBalance;
      
      const { expanded, summary } = calculateMonthSummary(monthDate, monthOpeningBalance);
      
      // Apply filter but keep the original running balances from the full list
      let filtered = expanded;
      switch (filter) {
        case 'pending':
          filtered = expanded.filter((t) => !t.isPaid);
          break;
        case 'paid':
          filtered = expanded.filter((t) => t.isPaid);
          break;
        case 'income':
          filtered = expanded.filter((t) => t.type === 'income');
          break;
        case 'expense':
          filtered = expanded.filter((t) => t.type === 'expense');
          break;
        case 'scheduled':
          filtered = expanded.filter((t) => !t.isPaid);
          break;
      }

      result.push({
        date: monthDate,
        label: format(monthDate, 'MMMM yyyy'),
        transactions: filtered,
        summary,
      });
    }

    return result;
  }, [selectedDate, additionalMonths, transactions, filter, openingBalance, calculateMonthSummary]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (transaction: Omit<Transaction, 'id' | 'orderIndex'>) => {
      if (!user) throw new Error('User not authenticated');
      return createTransaction(transaction, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Transação criada',
        description: 'A transação foi criada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar transação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Transaction, 'id'>> }) => 
      updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Transação atualizada',
        description: 'A transação foi atualizada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar transação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const togglePaidMutation = useMutation({
    mutationFn: ({ id, isPaid }: { id: string; isPaid: boolean }) => 
      toggleTransactionPaid(id, isPaid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar transação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Transação excluída',
        description: 'A transação foi excluída com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir transação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reorder transactions
  const reorderTransactions = useCallback(async (
    newOrder: TransactionWithBalance[],
    dateChanges?: { id: string; newDate: string }[]
  ) => {
    const updates = newOrder.map((t, index) => ({
      id: t.id,
      orderIndex: index + 1,
      date: dateChanges?.find(d => d.id === t.id)?.newDate,
    }));

    try {
      await reorderTransactionsService(updates);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } catch (error) {
      toast({
        title: 'Erro ao reordenar transações',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  }, [queryClient, toast]);

  // Toggle paid status
  const togglePaid = useCallback((id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      togglePaidMutation.mutate({ id, isPaid: !transaction.isPaid });
    }
  }, [transactions, togglePaidMutation]);

  // Add new transaction with optional tags
  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'orderIndex'>, tagIds?: string[]) => {
    if (!user) return;
    try {
      const createdTransaction = await createMutation.mutateAsync(transaction);
      if (tagIds && tagIds.length > 0 && createdTransaction) {
        await setTransactionTags(createdTransaction.id, tagIds, user.id);
        queryClient.invalidateQueries({ queryKey: ['transaction-tags-bulk'] });
      }
    } catch (error) {
      // Error already handled by mutation
    }
  }, [createMutation, user, queryClient]);

  // Update existing transaction with recurring action support
  const updateTransactionFn = useCallback(async (
    id: string, 
    updates: Partial<Transaction>,
    recurringAction?: RecurringUpdateAction,
    tagIds?: string[]
  ) => {
    if (!user) return;
    const originalTransaction = transactions.find(t => t.id === id || t.parentId === id);
    const isRecurringOrInstallment = originalTransaction && 
      (originalTransaction.recurrenceType === 'recurring' || originalTransaction.recurrenceType === 'installment');

    // Handle tags update for the real transaction id
    const realTransactionId = originalTransaction?.parentId || id;
    // Only update tags if it's a real DB ID (not a virtual instance ID)
    const isRealId = !id.includes('-inst-') && !id.match(/-\d{4}-\d{2}$/);
    
    if (tagIds !== undefined && isRealId) {
      try {
        await setTransactionTags(realTransactionId, tagIds, user.id);
        queryClient.invalidateQueries({ queryKey: ['transaction-tags-bulk'] });
        queryClient.invalidateQueries({ queryKey: ['transaction-tags'] });
      } catch (error) {
        console.error('Error updating tags:', error);
      }
    }

    if (!isRecurringOrInstallment || !recurringAction) {
      updateMutation.mutate({ id, data: updates });
      return;
    }

    const parentId = originalTransaction.parentId || id;
    try {
      if (recurringAction.type === 'only_this') {
        await createRecurringException({
          parentId,
          exceptionDate: recurringAction.instanceDate,
          exceptionType: 'modified',
          modifiedAmount: updates.amount,
          modifiedDescription: updates.description,
          modifiedCategoryId: updates.categoryId,
          modifiedAccountId: updates.accountId,
          modifiedIsPaid: updates.isPaid,
          modifiedNotes: updates.notes,
        }, user.id);
        queryClient.invalidateQueries({ queryKey: ['recurring-exceptions'] });
      } else if (recurringAction.type === 'this_and_future') {
        await setTransactionEndDate(parentId, recurringAction.instanceDate);
        const newTx = { ...originalTransaction, ...updates, startDate: recurringAction.instanceDate, date: recurringAction.instanceDate, parentId: undefined };
        delete (newTx as { id?: string }).id;
        delete (newTx as { orderIndex?: number }).orderIndex;
        await createTransaction(newTx as Omit<Transaction, 'id' | 'orderIndex'>, user.id);
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      } else {
        updateMutation.mutate({ id: parentId, data: updates });
      }
    } catch (error) {
      toast({ title: 'Erro', description: error instanceof Error ? error.message : 'Erro', variant: 'destructive' });
    }
  }, [updateMutation, user, transactions, queryClient, toast]);

  // Delete transaction with recurring action support
  const deleteTransactionFn = useCallback(async (id: string, recurringAction?: RecurringUpdateAction) => {
    if (!user) return;
    const originalTransaction = transactions.find(t => t.id === id || t.parentId === id);
    const isRecurringOrInstallment = originalTransaction && 
      (originalTransaction.recurrenceType === 'recurring' || originalTransaction.recurrenceType === 'installment');

    if (!isRecurringOrInstallment || !recurringAction) {
      deleteMutation.mutate(id);
      return;
    }

    const parentId = originalTransaction.parentId || id;
    try {
      if (recurringAction.type === 'only_this') {
        await createRecurringException({ parentId, exceptionDate: recurringAction.instanceDate, exceptionType: 'skip' }, user.id);
        queryClient.invalidateQueries({ queryKey: ['recurring-exceptions'] });
      } else if (recurringAction.type === 'this_and_future') {
        await setTransactionEndDate(parentId, recurringAction.instanceDate);
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      } else {
        deleteMutation.mutate(parentId);
      }
    } catch (error) {
      toast({ title: 'Erro', description: error instanceof Error ? error.message : 'Erro', variant: 'destructive' });
    }
  }, [deleteMutation, user, transactions, queryClient, toast]);

  return {
    monthsData,
    currentMonth: monthsData[0] || { date: selectedDate, label: '', transactions: [], summary: { totalIncome: 0, totalExpense: 0, balance: 0, openingBalance: 0, closingBalance: 0 } },
    categories,
    accounts,
    filter,
    setFilter,
    reorderTransactions,
    togglePaid,
    addTransaction,
    updateTransaction: updateTransactionFn,
    deleteTransaction: deleteTransactionFn,
    isLoading: transactionsQuery.isLoading || accountsQuery.isLoading || categoriesQuery.isLoading,
    isError: transactionsQuery.isError || accountsQuery.isError || categoriesQuery.isError,
  };
}
