import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { MonthSelector } from '@/components/finance/MonthSelector';
import { FilterPills } from '@/components/finance/FilterPills';
import { TransactionList } from '@/components/finance/TransactionList';
import { TransactionForm } from '@/components/finance/TransactionForm';
import { MonthColumn } from '@/components/finance/MonthColumn';
import { useMultiMonthTransactions } from '@/hooks/useMultiMonthTransactions';
import { useDeviceType } from '@/hooks/use-responsive';
import { useProfile } from '@/hooks/useProfile';
import { formatCurrency } from '@/lib/format';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransactionWithBalance } from '@/types/finance';

const SORT_ORDER_KEY = 'transactions-sort-order';

interface LocationState {
  newTransaction?: boolean;
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

  // Clean up location state if coming from auto-save
  useEffect(() => {
    const state = location.state as LocationState | null;
    if (state?.newTransaction) {
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

  return (
    <AppLayout>
      <Header showAvatar showNotification userName={displayName} />

      <main className="flex flex-col gap-6 p-6">

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Extrato</h1>
          <MonthSelector
            currentDate={selectedDate}
            onChange={setSelectedDate}
          />
        </div>

        {/* Month Summary - Only on mobile */}
        {isMobile && (
          <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border/50">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Orçamento</p>
              <p className={`text-lg font-bold ${(currentMonth.summary.totalIncome - currentMonth.summary.totalExpense) >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(currentMonth.summary.totalIncome - currentMonth.summary.totalExpense)}
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
          <FilterPills activeFilter={filter} onChange={setFilter} />
        </div>

        {isMobile && (
          <p className="text-xs text-muted-foreground">
            Arraste os lançamentos para reorganizar e recalcular o saldo automaticamente
          </p>
        )}

        {/* Mobile Layout - Single Column */}
        {isMobile && (
          <TransactionList
            transactions={currentMonth.transactions}
            onReorder={reorderTransactions}
            onTogglePaid={togglePaid}
            onTransactionClick={handleTransactionClick}
            sortOrder={sortOrder}
          />
        )}

        {/* Tablet/Desktop Layout - Multi Column */}
        {!isMobile && (
          <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${additionalMonths + 1}, minmax(0, 1fr))` }}>
            {/* Current Month - Editable */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Mês Atual</h3>
                  <p className="text-xs text-muted-foreground">Editável • Arraste para reorganizar</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-card p-3 rounded-xl border border-border/50">
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">Orçamento</p>
                  <p className={`text-sm font-bold ${(currentMonth.summary.totalIncome - currentMonth.summary.totalExpense) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(currentMonth.summary.totalIncome - currentMonth.summary.totalExpense)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground font-medium">Saldo Final</p>
                  <p className={`text-sm font-bold ${currentMonth.summary.closingBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(currentMonth.summary.closingBalance)}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[calc(100vh-350px)]">
                <TransactionList
                  transactions={currentMonth.transactions}
                  onReorder={reorderTransactions}
                  onTogglePaid={togglePaid}
                  onTransactionClick={handleTransactionClick}
                  sortOrder={sortOrder}
                />
              </div>
            </div>

            {/* Future Months - Read Only */}
            {monthsData.slice(1).map((monthData) => (
              <MonthColumn
                key={monthData.date.toISOString()}
                monthData={monthData}
                sortOrder={sortOrder}
              />
            ))}
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
    </AppLayout>
  );
}
