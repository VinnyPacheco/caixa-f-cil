import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { BalanceCard } from '@/components/finance/BalanceCard';
import { SummaryCards } from '@/components/finance/SummaryCards';
import { TransactionItem } from '@/components/finance/TransactionItem';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency } from '@/lib/format';

export default function Home() {
  const navigate = useNavigate();
  const [selectedDate] = useState(new Date());
  const { transactions, monthSummary, togglePaid } = useTransactions(selectedDate);

  // Get recent transactions (last 4)
  const recentTransactions = transactions.slice(0, 4);

  // Calculate percentage change (mock for now)
  const percentChange = monthSummary.balance > 0 ? 2.5 : -1.8;

  return (
    <AppLayout>
      <Header
        showAvatar
        showNotification
        userName="Usuário"
      />
      
      <main className="flex flex-col gap-6 p-6">
        <BalanceCard
          balance={monthSummary.closingBalance}
          percentChange={percentChange}
          onViewStatement={() => navigate('/transactions')}
        />

        <SummaryCards
          income={monthSummary.totalIncome}
          expense={monthSummary.totalExpense}
        />

        <div className="flex items-center justify-between pt-2">
          <h3 className="text-foreground text-lg font-bold leading-tight tracking-tight">
            Transações Recentes
          </h3>
          <button
            onClick={() => navigate('/transactions')}
            className="text-sm font-bold text-accent hover:opacity-80"
          >
            Ver tudo
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {recentTransactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              showDragHandle={false}
              showBalance={false}
              onTogglePaid={togglePaid}
              onClick={() => navigate('/transactions')}
            />
          ))}
        </div>
      </main>
    </AppLayout>
  );
}
