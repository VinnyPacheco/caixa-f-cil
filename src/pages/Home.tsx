import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { BalanceCard } from '@/components/finance/BalanceCard';
import { TransactionItem } from '@/components/finance/TransactionItem';
import { useTransactions } from '@/hooks/useTransactions';
import { useProfile } from '@/hooks/useProfile';
import { Loader2, AlertTriangle } from 'lucide-react';
import { addDays, parseISO, isAfter, isBefore, isEqual, startOfDay } from 'date-fns';

export default function Home() {
  const navigate = useNavigate();
  const { displayName } = useProfile();
  const [selectedDate] = useState(new Date());
  const { transactions, monthSummary, togglePaid, isLoading } = useTransactions(selectedDate);

  // Filter pending transactions that are overdue or due within 3 days
  const pendingUrgent = useMemo(() => {
    const today = startOfDay(new Date());
    const threshold = addDays(today, 3);
    
    return transactions
      .filter((t) => {
        if (t.isPaid) return false;
        const txDate = startOfDay(parseISO(t.date));
        return isBefore(txDate, threshold) || isEqual(txDate, threshold);
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions]);

  const percentChange = monthSummary.balance > 0 ? 2.5 : -1.8;

  if (isLoading) {
    return (
      <AppLayout>
        <Header showAvatar showNotification userName={displayName} />
        <div className="flex-1 flex items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Header
        showAvatar
        showNotification
        userName={displayName}
      />
      
      <main className="flex flex-col gap-6 p-6">
        <BalanceCard
          balance={monthSummary.closingBalance}
          percentChange={percentChange}
          onViewStatement={() => navigate('/transactions')}
        />

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="text-foreground text-lg font-bold leading-tight tracking-tight">
              Pendentes
            </h3>
          </div>
          <button
            onClick={() => navigate('/transactions')}
            className="text-sm font-bold text-accent hover:opacity-80"
          >
            Ver tudo
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          {pendingUrgent.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum lançamento pendente 🎉</p>
            </div>
          ) : (
            pendingUrgent.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                showDragHandle={false}
                showBalance={false}
                onTogglePaid={togglePaid}
                onClick={() => navigate('/transactions')}
              />
            ))
          )}
        </div>
      </main>
    </AppLayout>
  );
}
