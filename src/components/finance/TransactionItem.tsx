import { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TransactionWithBalance } from '@/types/finance';
import { Tag } from '@/types/tag';
import { formatCurrency } from '@/lib/format';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { TagDots } from './TagSelector';
import { CalendarCheck } from 'lucide-react';

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


interface TransactionItemProps {
  transaction: TransactionWithBalance;
  tags?: Tag[];
  showDragHandle?: boolean;
  showBalance?: boolean;
  isReadOnly?: boolean;
  onTogglePaid?: (id: string) => void;
  onClick?: () => void;
}

export const TransactionItem = forwardRef<HTMLDivElement, TransactionItemProps>(
  ({ transaction, tags = [], showDragHandle = true, showBalance = true, isReadOnly = false, onTogglePaid, onClick }, ref) => {
    const isIncome = transaction.type === 'income';
    const category = transaction.category;
    const dueStatus = getDueStatus(transaction);

    return (
      <div
        ref={ref}
        className={cn(
          "transaction-card",
          !isReadOnly && "cursor-pointer",
          isReadOnly && "opacity-75",
          dueStatus === 'overdue' && "border-l-4 border-l-destructive",
          dueStatus === 'due-soon' && "border-l-4 border-l-amber-500",
        )}
        onClick={!isReadOnly ? onClick : undefined}
      >
        {/* Left column: check + drag handle */}
        {showDragHandle && (
          <div className="flex flex-col items-center justify-between gap-1 shrink-0 mr-3">
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
            <span className="material-symbols-outlined text-muted-foreground/40 drag-handle text-lg">
              drag_indicator
            </span>
          </div>
        )}
        {!showDragHandle && (
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
        )}
        
        {/* Middle: description + category */}
        <div className="flex flex-col justify-center flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-foreground text-sm font-bold line-clamp-1">
              {transaction.description}
            </p>
            {tags.length > 0 && <TagDots tags={tags} />}
            {transaction.autoSettle && (
              <span title="Baixa Automática ativa"><CalendarCheck className="w-3.5 h-3.5 text-accent shrink-0" /></span>
            )}
          </div>
          <p className="text-muted-foreground text-xs font-normal">
            {category?.name || 'Sem categoria'}
          </p>
        </div>
        
        {/* Right: amount + balance */}
        <div className="shrink-0 text-right">
          <p className={isIncome ? 'amount-income' : 'amount-expense'}>
            {isIncome ? '+ ' : '- '}
            {formatCurrency(transaction.amount)}
          </p>
          {showBalance && (
            <p className="text-xs text-muted-foreground">
              Saldo: <span className={transaction.runningBalance < 0 ? "text-destructive" : ""}>{formatCurrency(transaction.runningBalance)}</span>
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
  tags = [],
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
        dueStatus === 'due-soon' && "border-l-4 border-l-amber-500",
      )}
      onClick={onClick}
    >
      {/* Left column: check + drag handle */}
      <div className="flex flex-col items-center justify-between gap-1 shrink-0 mr-3">
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
        <span
          {...attributes}
          {...listeners}
          className="material-symbols-outlined text-muted-foreground/40 drag-handle touch-none text-lg"
        >
          drag_indicator
        </span>
      </div>
      
        {/* Middle: description + category */}
        <div className="flex flex-col justify-center flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-foreground text-sm font-bold line-clamp-1">
              {transaction.description}
            </p>
            {tags.length > 0 && <TagDots tags={tags} />}
            {transaction.autoSettle && (
              <span title="Baixa Automática ativa"><CalendarCheck className="w-3.5 h-3.5 text-accent shrink-0" /></span>
            )}
          </div>
          <p className="text-muted-foreground text-xs font-normal">
            {category?.name || 'Sem categoria'}
          </p>
        </div>
      
      {/* Right: amount + balance */}
      <div className="shrink-0 text-right">
        <p className={isIncome ? 'amount-income' : 'amount-expense'}>
          {isIncome ? '+ ' : '- '}
          {formatCurrency(transaction.amount)}
        </p>
        {showBalance && (
            <p className="text-xs text-muted-foreground">
              Saldo: <span className={transaction.runningBalance < 0 ? "text-destructive" : ""}>{formatCurrency(transaction.runningBalance)}</span>
            </p>
        )}
      </div>
    </div>
  );
}
