import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { MonthSelector } from '@/components/finance/MonthSelector';
import { FilterPills } from '@/components/finance/FilterPills';
import { TransactionList } from '@/components/finance/TransactionList';
import { TransactionForm } from '@/components/finance/TransactionForm';
import { TransactionListContent } from '@/components/finance/TransactionListContent';
import { TransactionItem } from '@/components/finance/TransactionItem';
import { InvoiceDetailsDialog } from '@/components/finance/InvoiceDetailsDialog';
import { LeftSidePanel, RightSidePanel } from '@/components/finance/TransactionsSidePanels';
import { useMultiMonthTransactions } from '@/hooks/useMultiMonthTransactions';
import { useDeviceType } from '@/hooks/use-responsive';
import { useProfile } from '@/hooks/useProfile';
import { formatCurrency } from '@/lib/format';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { TransactionWithBalance } from '@/types/finance';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

const SORT_ORDER_KEY = 'transactions-sort-order';

interface LocationState {
  newTransaction?: boolean;
  selectedMonth?: string;
}

export default function Transactions() {
  const location = useLocation();
  const { displayName } = useProfile();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    const saved = localStorage.getItem(SORT_ORDER_KEY);
    return saved === 'asc' || saved === 'desc' ? saved : 'desc';
  });
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithBalance | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [invoiceDialogId, setInvoiceDialogId] = useState<string | null>(null);
  const [activeTransaction, setActiveTransaction] = useState<TransactionWithBalance | null>(null);
  const [leftExpanded, setLeftExpanded] = useState(true);
  const [rightExpanded, setRightExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  const deviceType = useDeviceType();
  const additionalMonths = deviceType === 'desktop' ? 2 : deviceType === 'tablet' ? 1 : 0;

  const {
    monthsData,
    currentMonth,
    categories,
    accounts,
    filter,
    setFilter,
    reorderTransactions,
    togglePaid,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useMultiMonthTransactions(selectedDate, additionalMonths);

  // All transactions across visible months for cross-month DnD
  const allVisibleTransactions = useMemo(
    () => monthsData.flatMap((m) => m.transactions),
    [monthsData]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const numericQuery = normalizedQuery.replace(/\./g, '').replace(',', '.');
  const filterBySearch = (txs: TransactionWithBalance[]) => {
    if (!normalizedQuery) return txs;
    return txs.filter((t) => {
      if (t.description?.toLowerCase().includes(normalizedQuery)) return true;
      const absAmount = Math.abs(t.amount);
      const amountDot = absAmount.toFixed(2);
      const amountComma = amountDot.replace('.', ',');
      if (amountDot.includes(numericQuery) || amountComma.includes(normalizedQuery)) return true;
      return false;
    });
  };

  const applyFilters = (txs: TransactionWithBalance[]) => {
    let filtered = filterBySearch(txs);
    if (selectedCategoryIds.length > 0) {
      filtered = filtered.filter((t) => selectedCategoryIds.includes(t.categoryId));
    }
    if (selectedAccountIds.length > 0) {
      filtered = filtered.filter((t) => selectedAccountIds.includes(t.accountId));
    }
    return filtered;
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };
  const clearCategories = () => setSelectedCategoryIds([]);

  const toggleAccount = (id: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };
  const clearAccounts = () => setSelectedAccountIds([]);

  // Handle navigation state (selected month or new transaction)
  useEffect(() => {
    const state = location.state as LocationState | null;
    if (state?.selectedMonth) {
      setSelectedDate(parseISO(state.selectedMonth));
      window.history.replaceState({}, document.title);
    } else if (state?.newTransaction) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const toggleSortOrder = () => {
    setSortOrder((prev) => {
      const newOrder = prev === 'asc' ? 'desc' : 'asc';
      localStorage.setItem(SORT_ORDER_KEY, newOrder);
      return newOrder;
    });
  };

  const handleTransactionClick = (transaction: TransactionWithBalance) => {
    if (transaction.isCreditCardInvoice) {
      setInvoiceDialogId(transaction.id);
      return;
    }
    if (transaction.isGoalPlaceholder) {
      return;
    }
    setEditingTransaction(transaction);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingTransaction(null);
    }
  };

  const isMobile = deviceType === 'mobile';

  const sideColumns = `${leftExpanded ? '20fr' : '40px'} ${
    leftExpanded && rightExpanded ? '60fr' : leftExpanded || rightExpanded ? '80fr' : '100fr'
  } ${rightExpanded ? '20fr' : '40px'}`;

  // Cross-month DnD sensors and handlers
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const tx = allVisibleTransactions.find((t) => t.id === event.active.id);
    setActiveTransaction(tx || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTransaction(null);
    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;
    const activeTx = allVisibleTransactions.find((t) => t.id === activeIdStr);
    if (!activeTx) return;

    let newTransactions = [...allVisibleTransactions];
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
      const overTx = allVisibleTransactions.find((t) => t.id === overIdStr);
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

    reorderTransactions(newTransactions, dateChanges.length > 0 ? dateChanges : undefined);
  };

  return (
    <AppLayout>
      <Header showAvatar showNotification userName={displayName} />

      <main className="flex flex-col gap-6 p-6">

        {/* Header with MonthSelector - Only on mobile */}
        {isMobile && (
          <div className="flex items-center justify-center">
            <h1 className="text-2xl font-bold text-foreground sr-only">Extrato</h1>
            <MonthSelector
              currentDate={selectedDate}
              onChange={setSelectedDate}
            />
          </div>
        )}

        {/* Month Summary - Only on mobile */}
        {isMobile && (
          <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border/50">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Saldo Inicial</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(currentMonth.summary.openingBalance)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-medium">Saldo Final</p>
              <p className={`text-lg font-bold ${currentMonth.summary.closingBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(currentMonth.summary.closingBalance)}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSortOrder}
            className="shrink-0 h-9 w-9"
            title={sortOrder === 'desc' ? 'Mais recente primeiro' : 'Mais antigo primeiro'}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <FilterPills activeFilter={filter} onChange={setFilter} />
          </div>
          <div className="relative shrink-0 ml-auto w-56 max-w-[40vw]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Procurar transação"
              className="h-9 pl-8 pr-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {isMobile && (
          <p className="text-xs text-muted-foreground">
            Arraste os lançamentos para reorganizar e recalcular o saldo automaticamente
          </p>
        )}

        {/* Mobile Layout - Single Column */}
        {isMobile && (
          <TransactionList
            transactions={applyFilters(currentMonth.transactions)}
            onReorder={reorderTransactions}
            onTogglePaid={togglePaid}
            onTransactionClick={handleTransactionClick}
            sortOrder={sortOrder}
          />
        )}

        {/* Tablet/Desktop Layout - Multi Column with cross-month DnD */}
        {!isMobile && (
          <div
            className="grid gap-4 items-start"
            style={{ gridTemplateColumns: sideColumns }}
          >
            <LeftSidePanel
              selectedDate={selectedDate}
              expanded={leftExpanded}
              onToggle={() => setLeftExpanded((v) => !v)}
              activeFilter={filter}
              categoryFilter={{
                selectedIds: selectedCategoryIds,
                onToggle: toggleCategory,
                onClear: clearCategories,
                hasSelection: selectedCategoryIds.length > 0,
              }}
              accountFilter={{
                selectedIds: selectedAccountIds,
                onToggle: toggleAccount,
                onClear: clearAccounts,
                hasSelection: selectedAccountIds.length > 0,
              }}
            />

            <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex flex-col gap-4 min-w-0">
              {/* Navigation Header */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDate(subMonths(selectedDate, 1))}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <div className="flex-1 grid gap-6" style={{ gridTemplateColumns: `repeat(${additionalMonths + 1}, minmax(0, 1fr))` }}>
                  {monthsData.map((monthData) => {
                    const monthLabel = format(monthData.date, 'MMMM', { locale: ptBR });
                    return (
                      <div
                        key={monthData.date.toISOString()}
                        className="text-center capitalize"
                      >
                        <h3 className="text-lg font-bold text-foreground">
                          {monthLabel}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Arraste para reorganizar
                        </p>
                      </div>
                    );
                  })}
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${additionalMonths + 1}, minmax(0, 1fr))` }}>
                {monthsData.map((monthData) => (
                  <div key={monthData.date.toISOString()} className="flex flex-col gap-4 min-w-0">
                    {/* Summary Card */}
                    <div className="flex items-center justify-between bg-card p-3 rounded-xl border border-border/50">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-medium">Saldo Inicial</p>
                        <p className="text-sm font-bold text-foreground">
                          {formatCurrency(monthData.summary.openingBalance)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground font-medium">Saldo Final</p>
                        <p className={`text-sm font-bold ${monthData.summary.closingBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(monthData.summary.closingBalance)}
                        </p>
                      </div>
                    </div>

                    {/* Transactions */}
                    <div className="flex-1 overflow-y-auto max-h-[calc(100vh-350px)]">
                      <TransactionListContent
                        transactions={applyFilters(monthData.transactions)}
                        onTogglePaid={togglePaid}
                        onTransactionClick={handleTransactionClick}
                        sortOrder={sortOrder}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DragOverlay>
              {activeTransaction && (
                <TransactionItem
                  transaction={activeTransaction}
                  showDragHandle={false}
                />
              )}
            </DragOverlay>
            </DndContext>

            <RightSidePanel
              selectedDate={selectedDate}
              expanded={rightExpanded}
              onToggle={() => setRightExpanded((v) => !v)}
              activeFilter={filter}
            />
          </div>
        )}
      </main>

      <TransactionForm
        open={formOpen}
        onOpenChange={handleFormClose}
        transaction={editingTransaction}
        categories={categories}
        accounts={accounts}
        onSave={addTransaction}
        onUpdate={updateTransaction}
        onDelete={deleteTransaction}
      />

      <InvoiceDetailsDialog
        open={!!invoiceDialogId}
        onOpenChange={(o) => !o && setInvoiceDialogId(null)}
        invoiceId={invoiceDialogId}
      />
    </AppLayout>
  );
}
