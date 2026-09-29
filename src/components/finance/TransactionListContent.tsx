import { Fragment, useMemo, useState } from 'react';
import { QuickAddCard, QuickAddInsertLine, QuickAddData, QuickAddPosition } from './QuickAddTransaction';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { TransactionWithBalance } from '@/types/finance';
import { Tag } from '@/types/tag';
import { SortableTransactionItem, TransactionItem } from './TransactionItem';
import { groupTransactionsByDate } from '@/lib/format';
import { useTransactionTagsBulk } from '@/hooks/useTags';

interface DroppableDateGroupProps {
  date: string;
  label: string;
  transactions: TransactionWithBalance[];
  tagsMap: Record<string, Tag[]>;
  onTogglePaid?: (id: string) => void;
  onTransactionClick?: (transaction: TransactionWithBalance) => void;
  isDraggable?: boolean;
  onQuickAdd?: QuickAddHandler;
}

export type QuickAddHandler = (
  anchor: TransactionWithBalance,
  position: QuickAddPosition,
  data: QuickAddData
) => Promise<void>;

function DroppableDateGroup({
  date,
  label,
  transactions,
  tagsMap,
  onTogglePaid,
  onTransactionClick,
  isDraggable = true,
  onQuickAdd,
}: DroppableDateGroupProps) {
  const [draft, setDraft] = useState<{ index: number } | null>(null);
  const quickEnabled = !!onQuickAdd && isDraggable && transactions.length > 0;

  // Insertion slot i means "before transactions[i]" (i === length means after the last)
  const renderSlot = (i: number) => {
    if (!quickEnabled) return null;
    if (draft?.index === i) {
      const anchor = i < transactions.length ? transactions[i] : transactions[transactions.length - 1];
      const position: QuickAddPosition = i < transactions.length ? 'before' : 'after';
      return (
        <div className="py-1">
          <QuickAddCard
            onCancel={() => setDraft(null)}
            onSave={async (data) => {
              await onQuickAdd!(anchor, position, data);
              setDraft(null);
            }}
          />
        </div>
      );
    }
    return <QuickAddInsertLine onClick={() => setDraft({ index: i })} />;
  };
  const { setNodeRef, isOver } = useDroppable({
    id: `date-${date}`,
    data: { date },
  });

  const transactionIds = transactions.map((t) => t.id);

  const getTagsForTransaction = (transaction: TransactionWithBalance): Tag[] => {
    const directTags = tagsMap[transaction.id];
    if (directTags && directTags.length > 0) return directTags;
    if (transaction.parentId) {
      const parentTags = tagsMap[transaction.parentId];
      if (parentTags && parentTags.length > 0) return parentTags;
    }
    return [];
  };

  return (
    <div key={date} className="flex flex-col gap-1.5">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
        {label}
      </p>
      <SortableContext items={transactionIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex flex-col ${quickEnabled ? 'gap-0' : 'gap-1.5'} min-h-[40px] rounded-lg transition-colors ${
            isOver ? 'bg-primary/10 ring-2 ring-primary/30' : ''
          }`}
        >
          {isDraggable ? (
            <>
              {transactions.map((transaction, i) => (
                <Fragment key={transaction.id}>
                  {renderSlot(i)}
                  <SortableTransactionItem
                    transaction={transaction}
                    tags={getTagsForTransaction(transaction)}
                    onTogglePaid={onTogglePaid}
                    onClick={() => onTransactionClick?.(transaction)}
                  />
                </Fragment>
              ))}
              {renderSlot(transactions.length)}
            </>
          ) : (
            transactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                tags={getTagsForTransaction(transaction)}
                showDragHandle={false}
                onTogglePaid={onTogglePaid}
                onClick={() => onTransactionClick?.(transaction)}
              />
            ))
          )}
          {transactions.length === 0 && isDraggable && (
            <div className="h-16 flex items-center justify-center text-muted-foreground/50 text-sm border-2 border-dashed border-muted-foreground/20 rounded-xl">
              Solte aqui
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

interface TransactionListContentProps {
  transactions: TransactionWithBalance[];
  onTogglePaid?: (id: string) => void;
  onTransactionClick?: (transaction: TransactionWithBalance) => void;
  sortOrder?: 'asc' | 'desc';
  isDraggable?: boolean;
  onQuickAdd?: QuickAddHandler;
}

export function TransactionListContent({
  transactions,
  onTogglePaid,
  onTransactionClick,
  sortOrder = 'desc',
  isDraggable = true,
  onQuickAdd,
}: TransactionListContentProps) {
  const transactionIds = useMemo(() => {
    const ids = new Set<string>();
    transactions.forEach(t => {
      ids.add(t.id);
      if (t.parentId) ids.add(t.parentId);
    });
    return Array.from(ids);
  }, [transactions]);

  const { data: tagsMap = {} } = useTransactionTagsBulk(transactionIds);

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
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <DroppableDateGroup
          key={group.date}
          date={group.date}
          label={group.label}
          transactions={group.transactions}
          tagsMap={tagsMap}
          onTogglePaid={onTogglePaid}
          onTransactionClick={onTransactionClick}
          isDraggable={isDraggable}
          onQuickAdd={onQuickAdd}
        />
      ))}
    </div>
  );
}
