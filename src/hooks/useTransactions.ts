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
} from '@/services/transactionsService';
import { fetchAccounts } from '@/services/accountsService';
import { fetchCategories } from '@/services/categoriesService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { calculateRunningBalances } from '@/lib/format';
import { FilterType } from '@/components/finance/FilterPills';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, addMonths, isBefore, isAfter } from 'date-fns';
import { useState } from 'react';

export function useTransactions(selectedDate: Date) {
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

  // Generate recurring transaction instances for the selected month
  const expandedTransactions = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    const result: Transaction[] = [];

    transactions.forEach((t) => {
      const transactionDate = parseISO(t.date);
      const transactionStartDate = t.startDate ? parseISO(t.startDate) : transactionDate;
      
      // For one-time transactions, include if in range
      if (t.recurrenceType === 'once') {
        if (isWithinInterval(transactionDate, { start, end })) {
          result.push(t);
        }
        return;
      }

      // For recurring (continuous) transactions
      if (t.recurrenceType === 'recurring') {
        const dayOfMonth = transactionStartDate.getDate();
        const instanceDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), dayOfMonth);
        
        if (!isAfter(transactionStartDate, end)) {
          if (isWithinInterval(transactionDate, { start, end })) {
            result.push(t);
          } else if (!isBefore(instanceDate, transactionStartDate)) {
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

      // For installment transactions
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

    return result;
  }, [transactions, selectedDate]);

  // Get transactions for the selected month (already filtered by expandedTransactions)
  const monthTransactions = useMemo(() => expandedTransactions, [expandedTransactions]);

  // Apply filter
  const filteredTransactions = useMemo(() => {
    switch (filter) {
      case 'pending':
        return monthTransactions.filter((t) => !t.isPaid);
      case 'paid':
        return monthTransactions.filter((t) => t.isPaid);
      case 'income':
        return monthTransactions.filter((t) => t.type === 'income');
      case 'expense':
        return monthTransactions.filter((t) => t.type === 'expense');
      case 'scheduled':
        return monthTransactions.filter((t) => !t.isPaid);
      default:
        return monthTransactions;
    }
  }, [monthTransactions, filter]);

  // Add category and account info, calculate running balances
  const transactionsWithBalance: TransactionWithBalance[] = useMemo(() => {
    const withRelations = filteredTransactions.map((t) => ({
      ...t,
      category: categories.find((c) => c.id === t.categoryId),
      account: accounts.find((a) => a.id === t.accountId),
      runningBalance: 0,
    }));

    return calculateRunningBalances(withRelations, openingBalance);
  }, [filteredTransactions, categories, accounts, openingBalance]);

  // Calculate month summary
  const monthSummary: MonthSummary = useMemo(() => {
    const totalIncome = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const closingBalance = openingBalance + totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      openingBalance,
      closingBalance,
    };
  }, [monthTransactions, openingBalance]);

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

  // Reorder transactions and optionally update dates
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

  // Add new transaction
  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'orderIndex'>) => {
    createMutation.mutate(transaction);
  }, [createMutation]);

  // Update existing transaction
  const updateTransactionFn = useCallback((id: string, updates: Partial<Transaction>) => {
    updateMutation.mutate({ id, data: updates });
  }, [updateMutation]);

  // Delete transaction
  const deleteTransactionFn = useCallback((id: string) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  return {
    transactions: transactionsWithBalance,
    categories,
    accounts,
    monthSummary,
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
