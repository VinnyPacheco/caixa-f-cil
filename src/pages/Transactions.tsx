import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { MonthSelector } from '@/components/finance/MonthSelector';
import { FilterPills } from '@/components/finance/FilterPills';
import { TransactionList } from '@/components/finance/TransactionList';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency } from '@/lib/format';

export default function Transactions() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const {
    transactions,
    monthSummary,
    filter,
    setFilter,
    reorderTransactions,
    togglePaid,
  } = useTransactions(selectedDate);

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

        <FilterPills activeFilter={filter} onChange={setFilter} />

        <p className="text-xs text-muted-foreground">
          Arraste os lançamentos para reorganizar e recalcular o saldo automaticamente
        </p>

        <TransactionList
          transactions={transactions}
          onReorder={reorderTransactions}
          onTogglePaid={togglePaid}
        />
      </main>
    </AppLayout>
  );
}
