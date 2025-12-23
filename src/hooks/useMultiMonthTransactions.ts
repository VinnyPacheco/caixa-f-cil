import { useState, useMemo, useCallback } from 'react';
import { Transaction, TransactionWithBalance, Category, Account, MonthSummary } from '@/types/finance';
import { mockTransactions, mockCategories, mockAccounts, mockOpeningBalance } from '@/data/mockData';
import { calculateRunningBalances } from '@/lib/format';
import { FilterType } from '@/components/finance/FilterPills';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, addMonths, isBefore, isAfter } from 'date-fns';

// Helper function to expand transactions for a specific month
function expandTransactionsForMonth(
  transactions: Transaction[],
  targetDate: Date,
  categories: Category[],
  accounts: Account[]
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

  return calculateRunningBalances(withRelations, mockOpeningBalance);
}

export interface MonthData {
  date: Date;
  label: string;
  transactions: TransactionWithBalance[];
  summary: MonthSummary;
}

export function useMultiMonthTransactions(selectedDate: Date, additionalMonths: number) {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [categories] = useState<Category[]>(mockCategories);
  const [accounts] = useState<Account[]>(mockAccounts);
  const [filter, setFilter] = useState<FilterType>('all');

  // Generate data for multiple months
  const monthsData = useMemo(() => {
    const result: MonthData[] = [];
    
    for (let i = 0; i <= additionalMonths; i++) {
      const monthDate = addMonths(selectedDate, i);
      const expanded = expandTransactionsForMonth(transactions, monthDate, categories, accounts);
      
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
      const closingBalance = mockOpeningBalance + totalIncome - totalExpense;

      result.push({
        date: monthDate,
        label: format(monthDate, 'MMMM yyyy'),
        transactions: filtered,
        summary: {
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          openingBalance: mockOpeningBalance,
          closingBalance,
        },
      });
    }

    return result;
  }, [selectedDate, additionalMonths, transactions, categories, accounts, filter]);

  // Reorder transactions
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
    monthsData,
    currentMonth: monthsData[0],
    categories,
    accounts,
    filter,
    setFilter,
    reorderTransactions,
    togglePaid,
    addTransaction,
    updateTransaction,
  };
}
