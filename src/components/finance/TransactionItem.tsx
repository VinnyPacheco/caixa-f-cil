import { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TransactionWithBalance } from '@/types/finance';
import { formatCurrency } from '@/lib/format';

interface TransactionItemProps {
  transaction: TransactionWithBalance;
  showDragHandle?: boolean;
  showBalance?: boolean;
  onTogglePaid?: (id: string) => void;
  onClick?: () => void;
}

export const TransactionItem = forwardRef<HTMLDivElement, TransactionItemProps>(
  ({ transaction, showDragHandle = true, showBalance = true, onTogglePaid, onClick }, ref) => {
    const isIncome = transaction.type === 'income';
    const category = transaction.category;

    return (
      <div
        ref={ref}
        className="transaction-card cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          {showDragHandle && (
            <span className="material-symbols-outlined text-muted-foreground/40 drag-handle">
              drag_indicator
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePaid?.(transaction.id);
            }}
            className={transaction.isPaid ? 'status-paid' : 'status-pending'}
          >
            {transaction.isPaid && (
              <span className="material-symbols-outlined text-sm font-bold">check</span>
            )}
          </button>
          <div className="flex flex-col justify-center">
            <p className="text-foreground text-base font-bold line-clamp-1">
              {transaction.description}
            </p>
            <p className="text-muted-foreground text-sm font-normal">
              {category?.name || 'Sem categoria'}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={isIncome ? 'amount-income' : 'amount-expense'}>
            {isIncome ? '+ ' : '- '}
            {formatCurrency(transaction.amount)}
          </p>
          {showBalance && (
            <p className="text-xs text-muted-foreground">
              Saldo: {formatCurrency(transaction.runningBalance)}
            </p>
          )}
        </div>
      </div>
    );
  }
);

TransactionItem.displayName = 'TransactionItem';

// Sortable wrapper for drag and drop
export function SortableTransactionItem({
  transaction,
  showBalance = true,
  onTogglePaid,
  onClick,
}: TransactionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: transaction.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const isIncome = transaction.type === 'income';
  const category = transaction.category;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`transaction-card ${isDragging ? 'shadow-xl scale-[1.02]' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <span
          {...attributes}
          {...listeners}
          className="material-symbols-outlined text-muted-foreground/40 drag-handle touch-none"
        >
          drag_indicator
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePaid?.(transaction.id);
          }}
          className={transaction.isPaid ? 'status-paid' : 'status-pending'}
        >
          {transaction.isPaid && (
            <span className="material-symbols-outlined text-sm font-bold">check</span>
          )}
        </button>
        <div className="flex flex-col justify-center">
          <p className="text-foreground text-base font-bold line-clamp-1">
            {transaction.description}
          </p>
          <p className="text-muted-foreground text-sm font-normal">
            {category?.name || 'Sem categoria'}
          </p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className={isIncome ? 'amount-income' : 'amount-expense'}>
          {isIncome ? '+ ' : '- '}
          {formatCurrency(transaction.amount)}
        </p>
        {showBalance && (
          <p className="text-xs text-muted-foreground">
            Saldo: {formatCurrency(transaction.runningBalance)}
          </p>
        )}
      </div>
    </div>
  );
}
