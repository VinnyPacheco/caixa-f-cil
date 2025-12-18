import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TransactionWithBalance, TransactionGroup } from '@/types/finance';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDateLabel(dateString: string): string {
  const date = parseISO(dateString);
  
  if (isToday(date)) {
    return 'Hoje';
  }
  
  if (isYesterday(date)) {
    return 'Ontem';
  }
  
  return format(date, "dd 'de' MMMM", { locale: ptBR });
}

export function groupTransactionsByDate(
  transactions: TransactionWithBalance[],
  sortOrder: 'asc' | 'desc' = 'desc'
): TransactionGroup[] {
  const groups: Map<string, TransactionWithBalance[]> = new Map();

  // Sort transactions by date based on sortOrder, then by orderIndex
  const sorted = [...transactions].sort((a, b) => {
    const dateCompare = sortOrder === 'desc'
      ? new Date(b.date).getTime() - new Date(a.date).getTime()
      : new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.orderIndex - b.orderIndex;
  });

  sorted.forEach((transaction) => {
    const dateKey = transaction.date;
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(transaction);
  });

  return Array.from(groups.entries()).map(([date, transactions]) => ({
    date,
    label: formatDateLabel(date),
    transactions,
  }));
}

export function calculateRunningBalances(
  transactions: TransactionWithBalance[],
  openingBalance: number
): TransactionWithBalance[] {
  // Sort by date ascending, then by orderIndex
  const sorted = [...transactions].sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.orderIndex - b.orderIndex;
  });

  let runningBalance = openingBalance;
  
  return sorted.map((transaction) => {
    if (transaction.type === 'income') {
      runningBalance += transaction.amount;
    } else {
      runningBalance -= transaction.amount;
    }
    
    return {
      ...transaction,
      runningBalance,
    };
  });
}
