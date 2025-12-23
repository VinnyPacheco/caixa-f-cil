import { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TransactionWithBalance } from '@/types/finance';
import { formatCurrency } from '@/lib/format';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

type DueStatus = 'overdue' | 'due-soon' | 'normal';

function getDueStatus(transaction: TransactionWithBalance): DueStatus {
  // Only check unpaid transactions
  if (transaction.isPaid) return 'normal';
  
  const today = startOfDay(new Date());
  const dueDate = startOfDay(parseISO(transaction.date));
  const daysUntilDue = differenceInDays(dueDate, today);
  
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 3) return 'due-soon';
  return 'normal';
}

function DueBadge({ status }: { status: DueStatus }) {
  if (status === 'normal') return null;
  
  return (
    <span
      className={cn(
        "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
        status === 'overdue' && "bg-destructive/15 text-destructive",
        status === 'due-soon' && "bg-amber-500/15 text-amber-600 dark:text-amber-400"
      )}
    >
      {status === 'overdue' ? 'Vencido' : 'Vence em breve'}
    </span>
  );
}

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
    const dueStatus = getDueStatus(transaction);

    return (
      <div
        ref={ref}
        className={cn(
          "transaction-card cursor-pointer",
          dueStatus === 'overdue' && "border-l-4 border-l-destructive",
          dueStatus === 'due-soon' && "border-l-4 border-l-amber-500"
        )}
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
            <div className="flex items-center gap-2">
              <p className="text-foreground text-base font-bold line-clamp-1">
                {transaction.description}
              </p>
              <DueBadge status={dueStatus} />
            </div>
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
  const dueStatus = getDueStatus(transaction);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "transaction-card",
        isDragging ? 'shadow-xl scale-[1.02]' : '',
        dueStatus === 'overdue' && "border-l-4 border-l-destructive",
        dueStatus === 'due-soon' && "border-l-4 border-l-amber-500"
      )}
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
          <div className="flex items-center gap-2">
            <p className="text-foreground text-base font-bold line-clamp-1">
              {transaction.description}
            </p>
            <DueBadge status={dueStatus} />
          </div>
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
