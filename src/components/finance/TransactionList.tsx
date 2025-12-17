import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TransactionWithBalance, TransactionGroup } from '@/types/finance';
import { SortableTransactionItem } from './TransactionItem';
import { formatDateLabel, groupTransactionsByDate } from '@/lib/format';

interface TransactionListProps {
  transactions: TransactionWithBalance[];
  onReorder: (transactions: TransactionWithBalance[]) => void;
  onTogglePaid: (id: string) => void;
  onTransactionClick?: (transaction: TransactionWithBalance) => void;
}

export function TransactionList({
  transactions,
  onReorder,
  onTogglePaid,
  onTransactionClick,
}: TransactionListProps) {
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

  const groups = useMemo(() => groupTransactionsByDate(transactions), [transactions]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = transactions.findIndex((t) => t.id === active.id);
      const newIndex = transactions.findIndex((t) => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newTransactions = arrayMove(transactions, oldIndex, newIndex);
        onReorder(newTransactions);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.date} className="flex flex-col gap-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
              {group.label}
            </p>
            <SortableContext
              items={group.transactions.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-3">
                {group.transactions.map((transaction) => (
                  <SortableTransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    onTogglePaid={onTogglePaid}
                    onClick={() => onTransactionClick?.(transaction)}
                  />
                ))}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  );
}
