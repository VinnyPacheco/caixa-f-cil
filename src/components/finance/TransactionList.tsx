import { useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { TransactionWithBalance } from '@/types/finance';
import { TransactionItem } from './TransactionItem';
import { TransactionListContent } from './TransactionListContent';

interface TransactionListProps {
  transactions: TransactionWithBalance[];
  onReorder: (transactions: TransactionWithBalance[], dateChanges?: { id: string; newDate: string }[]) => void;
  onTogglePaid: (id: string) => void;
  onTransactionClick?: (transaction: TransactionWithBalance) => void;
  sortOrder?: 'asc' | 'desc';
}

export function TransactionList({
  transactions,
  onReorder,
  onTogglePaid,
  onTransactionClick,
  sortOrder = 'desc',
}: TransactionListProps) {
  const [activeTransaction, setActiveTransaction] = useState<TransactionWithBalance | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const transaction = transactions.find((t) => t.id === event.active.id);
    setActiveTransaction(transaction || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTransaction(null);
    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;
    const activeTx = transactions.find((t) => t.id === activeIdStr);
    if (!activeTx) return;

    let newTransactions = [...transactions];
    const dateChanges: { id: string; newDate: string }[] = [];

    if (overIdStr.startsWith('date-')) {
      const newDate = over.data.current?.date;
      if (newDate && newDate !== activeTx.date) {
        dateChanges.push({ id: activeIdStr, newDate });
        newTransactions = newTransactions.map((t) =>
          t.id === activeIdStr ? { ...t, date: newDate } : t
        );
      }
    } else {
      const overTx = transactions.find((t) => t.id === overIdStr);
      if (overTx) {
        if (activeTx.date !== overTx.date) {
          dateChanges.push({ id: activeIdStr, newDate: overTx.date });
          newTransactions = newTransactions.map((t) =>
            t.id === activeIdStr ? { ...t, date: overTx.date } : t
          );
        }
        if (activeIdStr !== overIdStr) {
          const oldIndex = newTransactions.findIndex((t) => t.id === activeIdStr);
          const newIndex = newTransactions.findIndex((t) => t.id === overIdStr);
          if (oldIndex !== -1 && newIndex !== -1) {
            newTransactions = arrayMove(newTransactions, oldIndex, newIndex);
          }
        }
      }
    }

    onReorder(newTransactions, dateChanges.length > 0 ? dateChanges : undefined);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <TransactionListContent
        transactions={transactions}
        onTogglePaid={onTogglePaid}
        onTransactionClick={onTransactionClick}
        sortOrder={sortOrder}
      />
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
