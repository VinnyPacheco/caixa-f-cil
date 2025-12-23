import { TransactionWithBalance } from '@/types/finance';
import { TransactionItem } from './TransactionItem';
import { groupTransactionsByDate } from '@/lib/format';
import { useMemo } from 'react';

interface ReadOnlyTransactionListProps {
  transactions: TransactionWithBalance[];
  sortOrder?: 'asc' | 'desc';
}

export function ReadOnlyTransactionList({
  transactions,
  sortOrder = 'desc',
}: ReadOnlyTransactionListProps) {
  const groups = useMemo(
    () => groupTransactionsByDate(transactions, sortOrder),
    [transactions, sortOrder]
  );

  if (transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Nenhum lançamento
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.date} className="flex flex-col gap-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
            {group.label}
          </p>
          <div className="flex flex-col gap-3">
            {group.transactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                showDragHandle={false}
                isReadOnly
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
