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

  // Generate data for multiple months
  const monthsData = useMemo(() => {
    const result: MonthData[] = [];
    
    for (let i = 0; i <= additionalMonths; i++) {
      const monthDate = addMonths(selectedDate, i);
      const expanded = expandTransactionsForMonth(transactions, monthDate, categories, accounts, openingBalance);
      
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

      // Calculate summary
      const totalIncome = expanded
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = expanded
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      const closingBalance = openingBalance + totalIncome - totalExpense;

      result.push({
        date: monthDate,
        label: format(monthDate, 'MMMM yyyy'),
        transactions: filtered,
        summary: {
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          openingBalance,
          closingBalance,
        },
      });
    }

    return result;
  }, [selectedDate, additionalMonths, transactions, categories, accounts, filter, openingBalance]);

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
