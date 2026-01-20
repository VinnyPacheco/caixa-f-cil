import { useState, useMemo, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TransactionWithBalance } from '@/types/finance';
import { Tag } from '@/types/tag';
import { SortableTransactionItem, TransactionItem } from './TransactionItem';
import { groupTransactionsByDate } from '@/lib/format';
import { useTransactionTagsBulk } from '@/hooks/useTags';

interface TransactionListProps {
  transactions: TransactionWithBalance[];
  onReorder: (transactions: TransactionWithBalance[], dateChanges?: { id: string; newDate: string }[]) => void;
  onTogglePaid: (id: string) => void;
  onTransactionClick?: (transaction: TransactionWithBalance) => void;
  sortOrder?: 'asc' | 'desc';
}

interface DroppableDateGroupProps {
  date: string;
  label: string;
  transactions: TransactionWithBalance[];
  tagsMap: Record<string, Tag[]>;
  onTogglePaid: (id: string) => void;
  onTransactionClick?: (transaction: TransactionWithBalance) => void;
  activeId: string | null;
}

function DroppableDateGroup({
  date,
  label,
  transactions,
  tagsMap,
  onTogglePaid,
  onTransactionClick,
  activeId,
}: DroppableDateGroupProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `date-${date}`,
    data: { date },
  });

  const transactionIds = transactions.map((t) => t.id);

  // Helper to get tags for a transaction, considering parent IDs
  const getTagsForTransaction = (transaction: TransactionWithBalance): Tag[] => {
    // Try getting tags by current ID first
    const directTags = tagsMap[transaction.id];
    if (directTags && directTags.length > 0) return directTags;
    
    // If this is a virtual instance, try parent ID
    if (transaction.parentId) {
      const parentTags = tagsMap[transaction.parentId];
      if (parentTags && parentTags.length > 0) return parentTags;
    }
    
    return [];
  };

  return (
    <div key={date} className="flex flex-col gap-3">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
        {label}
      </p>
      <SortableContext items={transactionIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex flex-col gap-3 min-h-[60px] rounded-xl transition-colors ${
            isOver ? 'bg-primary/10 ring-2 ring-primary/30' : ''
          }`}
        >
          {transactions.map((transaction) => (
            <SortableTransactionItem
              key={transaction.id}
              transaction={transaction}
              tags={getTagsForTransaction(transaction)}
              onTogglePaid={onTogglePaid}
              onClick={() => onTransactionClick?.(transaction)}
            />
          ))}
          {transactions.length === 0 && (
            <div className="h-16 flex items-center justify-center text-muted-foreground/50 text-sm border-2 border-dashed border-muted-foreground/20 rounded-xl">
              Solte aqui
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function TransactionList({
  transactions,
  onReorder,
  onTogglePaid,
  onTransactionClick,
  sortOrder = 'desc',
}: TransactionListProps) {
  const [activeTransaction, setActiveTransaction] = useState<TransactionWithBalance | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const pendingDateChangeRef = useRef<string | null>(null);

  // Get all transaction IDs including parent IDs for tag lookup
  const transactionIds = useMemo(() => {
    const ids = new Set<string>();
    transactions.forEach(t => {
      ids.add(t.id);
      if (t.parentId) ids.add(t.parentId);
    });
    return Array.from(ids);
  }, [transactions]);

  // Fetch tags for all transactions
  const { data: tagsMap = {} } = useTransactionTagsBulk(transactionIds);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const groups = useMemo(() => groupTransactionsByDate(transactions, sortOrder), [transactions, sortOrder]);

  const handleDragStart = (event: DragStartEvent) => {
    const transaction = transactions.find((t) => t.id === event.active.id);
    setActiveTransaction(transaction || null);
    setActiveId(event.active.id as string);
    pendingDateChangeRef.current = null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveTransaction(null);
    setActiveId(null);
    
    if (!over) {
      pendingDateChangeRef.current = null;
      return;
    }

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    const activeTransaction = transactions.find((t) => t.id === activeIdStr);
    if (!activeTransaction) {
      pendingDateChangeRef.current = null;
      return;
    }

    let newTransactions = [...transactions];
    const dateChanges: { id: string; newDate: string }[] = [];

    // Check if dropping on a date group
    if (overIdStr.startsWith('date-')) {
      const newDate = over.data.current?.date;
      if (newDate && newDate !== activeTransaction.date) {
        // Update the date
        dateChanges.push({ id: activeIdStr, newDate });
        newTransactions = newTransactions.map((t) =>
          t.id === activeIdStr ? { ...t, date: newDate } : t
        );
      }
    } else {
      // Dropping on another transaction
      const overTransaction = transactions.find((t) => t.id === overIdStr);
      
      if (overTransaction) {
        // If different dates, change the active transaction's date first
        if (activeTransaction.date !== overTransaction.date) {
          dateChanges.push({ id: activeIdStr, newDate: overTransaction.date });
          newTransactions = newTransactions.map((t) =>
            t.id === activeIdStr ? { ...t, date: overTransaction.date } : t
          );
        }

        // Now reorder within the list
        if (activeIdStr !== overIdStr) {
          const oldIndex = newTransactions.findIndex((t) => t.id === activeIdStr);
          const newIndex = newTransactions.findIndex((t) => t.id === overIdStr);
          
          if (oldIndex !== -1 && newIndex !== -1) {
            newTransactions = arrayMove(newTransactions, oldIndex, newIndex);
          }
        }
      }
    }

    pendingDateChangeRef.current = null;
    onReorder(newTransactions, dateChanges.length > 0 ? dateChanges : undefined);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <DroppableDateGroup
            key={group.date}
            date={group.date}
            label={group.label}
            transactions={group.transactions}
            tagsMap={tagsMap}
            onTogglePaid={onTogglePaid}
            onTransactionClick={onTransactionClick}
            activeId={activeId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTransaction && (
          <TransactionItem
            transaction={activeTransaction}
            tags={tagsMap[activeTransaction.id] || tagsMap[activeTransaction.parentId || ''] || []}
            showDragHandle={false}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
