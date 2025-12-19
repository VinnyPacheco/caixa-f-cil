import { useState, useMemo, useCallback } from 'react';
import { Transaction, TransactionWithBalance, Category, Account, MonthSummary } from '@/types/finance';
import { mockTransactions, mockCategories, mockAccounts, mockOpeningBalance } from '@/data/mockData';
import { calculateRunningBalances } from '@/lib/format';
import { FilterType } from '@/components/finance/FilterPills';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

export function useTransactions(selectedDate: Date) {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [categories] = useState<Category[]>(mockCategories);
  const [accounts] = useState<Account[]>(mockAccounts);
  const [filter, setFilter] = useState<FilterType>('all');

  // Get transactions for the selected month
  const monthTransactions = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);

    return transactions.filter((t) => {
      const date = parseISO(t.date);
      return isWithinInterval(date, { start, end });
    });
  }, [transactions, selectedDate]);

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

    return calculateRunningBalances(withRelations, mockOpeningBalance);
  }, [filteredTransactions, categories, accounts]);

  // Calculate month summary
  const monthSummary: MonthSummary = useMemo(() => {
    const totalIncome = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const closingBalance = mockOpeningBalance + totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      openingBalance: mockOpeningBalance,
      closingBalance,
    };
  }, [monthTransactions]);

  // Reorder transactions and optionally update dates
  const reorderTransactions = useCallback((
    newOrder: TransactionWithBalance[],
    dateChanges?: { id: string; newDate: string }[]
  ) => {
    setTransactions((prev) => {
      const updatedIds = new Set(newOrder.map((t) => t.id));
      const dateChangeMap = new Map(dateChanges?.map((d) => [d.id, d.newDate]) || []);
      const unchanged = prev.filter((t) => !updatedIds.has(t.id));
      const reordered = newOrder.map((t, index) => {
        const original = prev.find((p) => p.id === t.id)!;
        return {
          ...original,
          orderIndex: index + 1,
          date: dateChangeMap.get(t.id) || original.date,
        };
      });
      return [...unchanged, ...reordered];
    });
  }, []);

  // Toggle paid status
  const togglePaid = useCallback((id: string) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, isPaid: !t.isPaid } : t
      )
    );
  }, []);

  // Add new transaction
  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'orderIndex'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `tr-${Date.now()}`,
      orderIndex: transactions.length + 1,
    };
    setTransactions((prev) => [...prev, newTransaction]);
  }, [transactions.length]);

  // Update existing transaction
  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

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
    updateTransaction,
  };
}
