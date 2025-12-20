import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { MonthSelector } from '@/components/finance/MonthSelector';
import { FilterPills } from '@/components/finance/FilterPills';
import { TransactionList } from '@/components/finance/TransactionList';
import { TransactionForm } from '@/components/finance/TransactionForm';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency } from '@/lib/format';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransactionWithBalance } from '@/types/finance';

const SORT_ORDER_KEY = 'transactions-sort-order';

export default function Transactions() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    const saved = localStorage.getItem(SORT_ORDER_KEY);
    return saved === 'asc' || saved === 'desc' ? saved : 'desc';
  });
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithBalance | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  
  const {
    transactions,
    categories,
    accounts,
    monthSummary,
    filter,
    setFilter,
    reorderTransactions,
    togglePaid,
    addTransaction,
    updateTransaction,
  } = useTransactions(selectedDate);

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

  return (
    <AppLayout>
      <Header showAvatar showNotification userName="Usuário" />

      <main className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Extrato</h1>
          <MonthSelector
            currentDate={selectedDate}
            onChange={setSelectedDate}
          />
        </div>

        {/* Month Summary */}
        <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border/50">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Saldo Inicial</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(monthSummary.openingBalance)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-medium">Saldo Final</p>
            <p className={`text-lg font-bold ${monthSummary.closingBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(monthSummary.closingBalance)}
            </p>
          </div>
        </div>

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

        <p className="text-xs text-muted-foreground">
          Arraste os lançamentos para reorganizar e recalcular o saldo automaticamente
        </p>

        <TransactionList
          transactions={transactions}
          onReorder={reorderTransactions}
          onTogglePaid={togglePaid}
          onTransactionClick={handleTransactionClick}
          sortOrder={sortOrder}
        />
      </main>

      <TransactionForm
        open={formOpen}
        onOpenChange={handleFormClose}
        transaction={editingTransaction}
        categories={categories}
        accounts={accounts}
        onSave={addTransaction}
        onUpdate={updateTransaction}
      />
    </AppLayout>
  );
}
