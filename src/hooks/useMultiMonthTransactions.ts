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
  deleteInstallment,
  deleteInstallmentAndFuture,
  deleteAllInstallments,
} from '@/services/transactionsService';
import { fetchAccounts } from '@/services/accountsService';
import { fetchCategories } from '@/services/categoriesService';
import { setTransactionTags } from '@/services/tagsService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { calculateRunningBalances } from '@/lib/format';
import { FilterType } from '@/components/finance/FilterPills';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, addMonths, isBefore } from 'date-fns';
import { useState } from 'react';
import { RecurringUpdateAction } from '@/components/finance/TransactionForm';

// Helper function to get transactions for a specific month (all are real DB records now)
function getTransactionsForMonth(
  transactions: Transaction[],
  targetDate: Date,
  categories: Category[],
  accounts: Account[],
  openingBalance: number
): TransactionWithBalance[] {
  const start = startOfMonth(targetDate);
  const end = endOfMonth(targetDate);

  const monthTransactions = transactions.filter((t) => {
    const transactionDate = parseISO(t.date);
    return isWithinInterval(transactionDate, { start, end });
  });

  // Add category and account info
  const withRelations = monthTransactions.map((t) => ({
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

  // Helper to calculate month summary
  const calculateMonthSummary = useCallback((
    monthDate: Date,
    monthOpeningBalance: number
  ): { expanded: TransactionWithBalance[]; summary: MonthSummary } => {
    const expanded = getTransactionsForMonth(transactions, monthDate, categories, accounts, monthOpeningBalance);
    
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
    
    // Calculate the opening balance for the selected month
    let currentOpeningBalance = openingBalance;
    const selectedMonthStart = startOfMonth(selectedDate);
    
    // Sum all transactions before the selected month
    transactions.forEach((t) => {
      const transactionDate = parseISO(t.date);
      if (isBefore(transactionDate, selectedMonthStart)) {
        currentOpeningBalance += t.type === 'income' ? t.amount : -t.amount;
      }
    });

    // Now generate data for selected month and additional months
    for (let i = 0; i <= additionalMonths; i++) {
      const monthDate = addMonths(selectedDate, i);
      const monthOpeningBalance = i === 0 ? currentOpeningBalance : result[i - 1].summary.closingBalance;
      
      const { expanded, summary } = calculateMonthSummary(monthDate, monthOpeningBalance);
      
      // Apply filter
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

  // Update existing transaction
  const updateTransactionFn = useCallback(async (
    id: string, 
    updates: Partial<Transaction>,
    recurringAction?: RecurringUpdateAction,
    tagIds?: string[]
  ) => {
    if (!user) return;

    const originalTransaction = transactions.find(t => t.id === id);
    if (!originalTransaction) {
      updateMutation.mutate({ id, data: updates });
      return;
    }

    // Handle tags update
    if (tagIds !== undefined) {
      try {
        await setTransactionTags(id, tagIds, user.id);
        queryClient.invalidateQueries({ queryKey: ['transaction-tags-bulk'] });
        queryClient.invalidateQueries({ queryKey: ['transaction-tags'] });
      } catch (error) {
        console.error('Error updating tags:', error);
      }
    }

    const isInstallment = originalTransaction.recurrenceType === 'installment';

    if (isInstallment && recurringAction) {
      switch (recurringAction.type) {
        case 'only_this':
          updateMutation.mutate({ id, data: updates });
          break;

        case 'this_and_future':
        case 'all':
          const seriesParentId = originalTransaction.parentId || id;
          
          if (seriesParentId !== id) {
            await updateTransaction(seriesParentId, updates);
          }
          await updateTransaction(id, updates);
          
          const siblings = transactions.filter(t => t.parentId === seriesParentId);
          
          if (recurringAction.type === 'this_and_future') {
            const currentDate = originalTransaction.date;
            for (const sibling of siblings) {
              if (sibling.date >= currentDate && sibling.id !== id) {
                await updateTransaction(sibling.id, updates);
              }
            }
          } else {
            for (const sibling of siblings) {
              if (sibling.id !== id) {
                await updateTransaction(sibling.id, updates);
              }
            }
          }
          
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          toast({
            title: 'Lançamento atualizado',
            description: recurringAction.type === 'all' 
              ? 'Todas as parcelas foram atualizadas.' 
              : 'Esta e as próximas parcelas foram atualizadas.',
          });
          break;
      }
    } else {
      updateMutation.mutate({ id, data: updates });
    }
  }, [updateMutation, user, transactions, queryClient, toast]);

  // Delete transaction with installment action support
  const deleteTransactionFn = useCallback(async (
    id: string,
    recurringAction?: RecurringUpdateAction
  ) => {
    if (!user) return;

    const originalTransaction = transactions.find(t => t.id === id);
    if (!originalTransaction) {
      deleteMutation.mutate(id);
      return;
    }

    const isInstallment = originalTransaction.recurrenceType === 'installment';

    if (!isInstallment || !recurringAction) {
      deleteMutation.mutate(id);
      return;
    }

    try {
      switch (recurringAction.type) {
        case 'only_this':
          await deleteInstallment(id);
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          toast({
            title: 'Parcela excluída',
            description: 'Apenas esta parcela foi removida.',
          });
          break;

        case 'this_and_future':
          await deleteInstallmentAndFuture(
            id, 
            originalTransaction.parentId || null, 
            originalTransaction.date
          );
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          toast({
            title: 'Parcelas excluídas',
            description: 'Esta e as próximas parcelas foram removidas.',
          });
          break;

        case 'all':
          await deleteAllInstallments(id, originalTransaction.parentId || null);
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          toast({
            title: 'Lançamento excluído',
            description: 'Todas as parcelas foram removidas.',
          });
          break;
      }
    } catch (error) {
      toast({
        title: 'Erro ao excluir transação',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  }, [deleteMutation, user, transactions, queryClient, toast]);

  // Convenience: get first month data for mobile view
  const currentMonth = monthsData[0] || {
    date: selectedDate,
    label: '',
    transactions: [],
    summary: { totalIncome: 0, totalExpense: 0, balance: 0, openingBalance: 0, closingBalance: 0 }
  };

  return {
    monthsData,
    currentMonth,
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
