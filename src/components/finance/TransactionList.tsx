import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
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
import { TransactionWithBalance, TransactionGroup } from '@/types/finance';
import { SortableTransactionItem, TransactionItem } from './TransactionItem';
import { formatDateLabel, groupTransactionsByDate } from '@/lib/format';

interface TransactionListProps {
  transactions: TransactionWithBalance[];
  onReorder: (transactions: TransactionWithBalance[], dateChanges?: { id: string; newDate: string }[]) => void;
  onTogglePaid: (id: string) => void;
  onTransactionClick?: (transaction: TransactionWithBalance) => void;
}

interface DroppableDateGroupProps {
  date: string;
  label: string;
  transactions: TransactionWithBalance[];
  onTogglePaid: (id: string) => void;
  onTransactionClick?: (transaction: TransactionWithBalance) => void;
}

function DroppableDateGroup({
  date,
  label,
  transactions,
  onTogglePaid,
  onTransactionClick,
}: DroppableDateGroupProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `date-${date}`,
    data: { date },
  });

  return (
    <div key={date} className="flex flex-col gap-3">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
        {label}
      </p>
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
    </div>
  );
}

export function TransactionList({
  transactions,
  onReorder,
  onTogglePaid,
  onTransactionClick,
}: TransactionListProps) {
  const [activeTransaction, setActiveTransaction] = useState<TransactionWithBalance | null>(null);
  const [localTransactions, setLocalTransactions] = useState<TransactionWithBalance[]>(transactions);

  // Sync with props
  useMemo(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

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

  const groups = useMemo(() => groupTransactionsByDate(localTransactions), [localTransactions]);
  const allTransactionIds = useMemo(() => localTransactions.map((t) => t.id), [localTransactions]);

  const handleDragStart = (event: DragStartEvent) => {
    const transaction = localTransactions.find((t) => t.id === event.active.id);
    setActiveTransaction(transaction || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dropping over a date group
    if (overId.startsWith('date-')) {
      const newDate = over.data.current?.date;
      if (!newDate) return;

      setLocalTransactions((prev) => {
        const activeTransaction = prev.find((t) => t.id === activeId);
        if (!activeTransaction || activeTransaction.date === newDate) return prev;

        // Update the transaction's date
        return prev.map((t) =>
          t.id === activeId ? { ...t, date: newDate } : t
        );
      });
      return;
    }

    // Check if dropping over another transaction
    const activeTransaction = localTransactions.find((t) => t.id === activeId);
    const overTransaction = localTransactions.find((t) => t.id === overId);

    if (!activeTransaction || !overTransaction) return;

    // If they're in different date groups, move the active one to the over transaction's date
    if (activeTransaction.date !== overTransaction.date) {
      setLocalTransactions((prev) => {
        return prev.map((t) =>
          t.id === activeId ? { ...t, date: overTransaction.date } : t
        );
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTransaction(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the transactions
    const activeTransaction = localTransactions.find((t) => t.id === activeId);
    const originalTransaction = transactions.find((t) => t.id === activeId);

    if (!activeTransaction || !originalTransaction) return;

    // Collect date changes
    const dateChanges: { id: string; newDate: string }[] = [];
    if (activeTransaction.date !== originalTransaction.date) {
      dateChanges.push({ id: activeId, newDate: activeTransaction.date });
    }

    // Handle reordering within the same group
    if (!overId.startsWith('date-') && activeId !== overId) {
      const oldIndex = localTransactions.findIndex((t) => t.id === activeId);
      const newIndex = localTransactions.findIndex((t) => t.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(localTransactions, oldIndex, newIndex);
        onReorder(reordered, dateChanges.length > 0 ? dateChanges : undefined);
        return;
      }
    }

    // Just commit the changes (date changes only)
    onReorder(localTransactions, dateChanges.length > 0 ? dateChanges : undefined);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={allTransactionIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <DroppableDateGroup
              key={group.date}
              date={group.date}
              label={group.label}
              transactions={group.transactions}
              onTogglePaid={onTogglePaid}
              onTransactionClick={onTransactionClick}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeTransaction && (
          <TransactionItem
            transaction={activeTransaction}
            showDragHandle={false}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
