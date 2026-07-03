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
import { useSimulation } from '@/contexts/SimulationContext';
import { useToast } from '@/hooks/use-toast';
import { calculateRunningBalances } from '@/lib/format';
import { FilterType } from '@/components/finance/FilterPills';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { buildInvoiceTransactions, toggleInvoicePaid } from '@/lib/creditCard';
import { useState } from 'react';
import { RecurringUpdateAction } from '@/components/finance/TransactionForm';

export type { RecurringUpdateAction } from '@/components/finance/TransactionForm';

export function useTransactions(selectedDate: Date) {
  const { user } = useAuth();
  const { isSimulation } = useSimulation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');

  // Fetch all data from Supabase (prevent refetch in simulation mode)
  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    enabled: !!user,
    staleTime: isSimulation ? Infinity : 0,
  });

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    enabled: !!user,
    staleTime: isSimulation ? Infinity : 0,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: !!user,
    staleTime: isSimulation ? Infinity : 0,
  });

  const transactions = transactionsQuery.data || [];
  const accounts = accountsQuery.data || [];
  const categories = categoriesQuery.data || [];

  // Credit cards are liabilities — their initial balance is excluded from cash totals.
  const openingBalance = useMemo(() => {
    return accounts
      .filter((a) => a.type !== 'credit_card')
      .reduce((sum, acc) => sum + acc.initialBalance, 0);
  }, [accounts]);

  const ccAccountIds = useMemo(
    () => new Set(accounts.filter((a) => a.type === 'credit_card').map((a) => a.id)),
    [accounts],
  );

  const invoiceTransactions = useMemo(
    () => buildInvoiceTransactions(transactions, accounts),
    [transactions, accounts],
  );

  // Real transactions for the month + virtual invoice rows due in the month.
  const monthTransactions = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);

    const realMonth = transactions.filter((t) =>
      isWithinInterval(parseISO(t.date), { start, end }),
    );
    const invoiceMonth = invoiceTransactions.filter((t) =>
      isWithinInterval(parseISO(t.date), { start, end }),
    );
    return [...realMonth, ...invoiceMonth];
  }, [transactions, invoiceTransactions, selectedDate]);

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

    // CC-account real transactions do NOT contribute to the running balance.
    const balanceItems = withRelations.filter((t) => !ccAccountIds.has(t.accountId));
    const ccItems = withRelations.filter((t) => ccAccountIds.has(t.accountId));
    const balanced = calculateRunningBalances(balanceItems, openingBalance);
    return [...balanced, ...ccItems];
  }, [filteredTransactions, categories, accounts, openingBalance, ccAccountIds]);

  // Calculate month summary
  const monthSummary: MonthSummary = useMemo(() => {
    const cashTxs = monthTransactions.filter((t) => !ccAccountIds.has(t.accountId));
    const totalIncome = cashTxs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = cashTxs
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
  }, [monthTransactions, openingBalance, ccAccountIds]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'orderIndex'>) => {
      if (!user) throw new Error('User not authenticated');
      if (isSimulation) {
        const fakeId = crypto.randomUUID();
        const fakeTx: Transaction = {
          ...transaction,
          id: fakeId,
          orderIndex: 0,
        };
        queryClient.setQueryData(['transactions'], (old: Transaction[] | undefined) => 
          [fakeTx, ...(old || [])]
        );
        return fakeTx;
      }
      return createTransaction(transaction, user.id);
    },
    onSuccess: () => {
      if (!isSimulation) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      }
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Transaction, 'id'>> }) => {
      if (isSimulation) {
        queryClient.setQueryData(['transactions'], (old: Transaction[] | undefined) =>
          (old || []).map(t => t.id === id ? { ...t, ...data } : t)
        );
        return { id, ...data } as Transaction;
      }
      return updateTransaction(id, data);
    },
    onSuccess: () => {
      if (!isSimulation) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      }
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
    mutationFn: async ({ id, isPaid }: { id: string; isPaid: boolean }) => {
      if (isSimulation) {
        queryClient.setQueryData(['transactions'], (old: Transaction[] | undefined) =>
          (old || []).map(t => t.id === id ? { ...t, isPaid } : t)
        );
        return { id, isPaid } as Transaction;
      }
      return toggleTransactionPaid(id, isPaid);
    },
    onSuccess: () => {
      if (!isSimulation) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      }
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
    mutationFn: async (id: string) => {
      if (isSimulation) {
        queryClient.setQueryData(['transactions'], (old: Transaction[] | undefined) =>
          (old || []).filter(t => t.id !== id)
        );
        return;
      }
      return deleteTransaction(id);
    },
    onSuccess: () => {
      if (!isSimulation) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      }
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
    const updates = newOrder.map((t, index) => {
      const dateChange = dateChanges?.find(d => d.id === t.id);
      return {
        id: t.id,
        orderIndex: index + 1,
        date: dateChange?.newDate,
      };
    });

    if (updates.length === 0) return;

    // Optimistic update: immediately update the cache
    queryClient.setQueryData(['transactions'], (oldData: Transaction[] | undefined) => {
      if (!oldData) return oldData;
      
      const updateMap = new Map(updates.map(u => [u.id, u]));
      return oldData.map(t => {
        const update = updateMap.get(t.id);
        if (update) {
          return {
            ...t,
            orderIndex: update.orderIndex,
            date: update.date || t.date,
          };
        }
        return t;
      });
    });

    if (isSimulation) {
      // In simulation mode, just keep the optimistic update (already done above)
      return;
    }

    try {
      await reorderTransactionsService(updates);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Erro ao reordenar transações',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  }, [queryClient, toast, isSimulation]);

  // Toggle paid status
  const togglePaid = useCallback((id: string) => {
    if (id.startsWith('invoice:')) {
      toggleInvoicePaid(id);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      return;
    }
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      togglePaidMutation.mutate({ id, isPaid: !transaction.isPaid });
    }
  }, [transactions, togglePaidMutation, queryClient]);

  // Add new transaction with optional tags
  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'orderIndex'>, tagIds?: string[]) => {
    if (!user) return;
    try {
      const createdTransaction = await createMutation.mutateAsync(transaction);
      if (tagIds && tagIds.length > 0 && createdTransaction && !isSimulation) {
        await setTransactionTags(createdTransaction.id, tagIds, user.id);
        queryClient.invalidateQueries({ queryKey: ['transaction-tags-bulk'] });
      }
    } catch (error) {
      // Error already handled by mutation
    }
  }, [createMutation, user, queryClient, isSimulation]);

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

    // Handle tags update (skip in simulation mode)
    if (tagIds !== undefined && !isSimulation) {
      try {
        await setTransactionTags(id, tagIds, user.id);
        queryClient.invalidateQueries({ queryKey: ['transaction-tags-bulk'] });
        queryClient.invalidateQueries({ queryKey: ['transaction-tags'] });
      } catch (error) {
        console.error('Error updating tags:', error);
      }
    }

    const isInstallment = originalTransaction.recurrenceType === 'installment';

    // For installment transactions with recurring action
    if (isInstallment && recurringAction) {
      switch (recurringAction.type) {
        case 'only_this':
          // Just update this specific installment record
          updateMutation.mutate({ id, data: updates });
          break;

        case 'this_and_future':
        case 'all':
          // When updating siblings, never propagate the date field — each
          // installment keeps its own scheduled date.
          const { date: _omitDate, ...siblingUpdates } = updates as Partial<Transaction>;
          if (isSimulation) {
            // In simulation, update cache directly for all related installments
            const simSeriesParentId = originalTransaction.parentId || id;
            queryClient.setQueryData(['transactions'], (old: Transaction[] | undefined) =>
              (old || []).map(t => {
                const isRelated = t.id === id || t.id === simSeriesParentId || t.parentId === simSeriesParentId;
                if (!isRelated) return t;
                if (recurringAction.type === 'this_and_future' && t.date < originalTransaction.date) return t;
                // The reference installment keeps the (possibly changed) date;
                // siblings keep their own date.
                if (t.id === id) return { ...t, ...updates };
                return { ...t, ...siblingUpdates };
              })
            );
            toast({
              title: 'Lançamento atualizado',
              description: recurringAction.type === 'all'
                ? 'Todas as parcelas foram atualizadas.'
                : 'Esta e as próximas parcelas foram atualizadas.',
            });
          } else {
            const seriesParentId = originalTransaction.parentId || id;
            if (seriesParentId !== id) {
              await updateTransaction(seriesParentId, siblingUpdates);
            }
            await updateTransaction(id, updates);
            const siblings = transactions.filter(t => t.parentId === seriesParentId);
            if (recurringAction.type === 'this_and_future') {
              const currentDate = originalTransaction.date;
              for (const sibling of siblings) {
                if (sibling.date >= currentDate && sibling.id !== id) {
                  await updateTransaction(sibling.id, siblingUpdates);
                }
              }
            } else {
              for (const sibling of siblings) {
                if (sibling.id !== id) {
                  await updateTransaction(sibling.id, siblingUpdates);
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
          }
          break;
      }
    } else {
      updateMutation.mutate({ id, data: updates });
    }
  }, [updateMutation, user, transactions, queryClient, toast, isSimulation]);

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
      if (isSimulation) {
        // In simulation mode, handle installment deletions in cache
        const simSeriesParentId = originalTransaction.parentId || id;
        switch (recurringAction.type) {
          case 'only_this':
            queryClient.setQueryData(['transactions'], (old: Transaction[] | undefined) =>
              (old || []).filter(t => t.id !== id)
            );
            toast({ title: 'Parcela excluída', description: 'Apenas esta parcela foi removida.' });
            break;
          case 'this_and_future':
            queryClient.setQueryData(['transactions'], (old: Transaction[] | undefined) =>
              (old || []).filter(t => {
                if (t.id === id) return false;
                if ((t.parentId === simSeriesParentId || t.id === simSeriesParentId) && t.date >= originalTransaction.date) return false;
                return true;
              })
            );
            toast({ title: 'Parcelas excluídas', description: 'Esta e as próximas parcelas foram removidas.' });
            break;
          case 'all':
            queryClient.setQueryData(['transactions'], (old: Transaction[] | undefined) =>
              (old || []).filter(t => t.id !== simSeriesParentId && t.parentId !== simSeriesParentId)
            );
            toast({ title: 'Lançamento excluído', description: 'Todas as parcelas foram removidas.' });
            break;
        }
        return;
      }

      switch (recurringAction.type) {
        case 'only_this':
          await deleteInstallment(id);
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          toast({ title: 'Parcela excluída', description: 'Apenas esta parcela foi removida.' });
          break;
        case 'this_and_future':
          await deleteInstallmentAndFuture(id, originalTransaction.parentId || null, originalTransaction.date);
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          toast({ title: 'Parcelas excluídas', description: 'Esta e as próximas parcelas foram removidas.' });
          break;
        case 'all':
          await deleteAllInstallments(id, originalTransaction.parentId || null);
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          toast({ title: 'Lançamento excluído', description: 'Todas as parcelas foram removidas.' });
          break;
      }
    } catch (error) {
      toast({
        title: 'Erro ao excluir transação',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  }, [deleteMutation, user, transactions, queryClient, toast, isSimulation]);

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
