import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency } from '@/lib/format';
import { useState } from 'react';

export default function Reports() {
  const [selectedDate] = useState(new Date());
  const { monthSummary, categories, transactions } = useTransactions(selectedDate);

  // Group expenses by category
  const expensesByCategory = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => {
      const catId = t.categoryId;
      if (!acc[catId]) {
        acc[catId] = { total: 0, category: t.category };
      }
      acc[catId].total += t.amount;
      return acc;
    }, {} as Record<string, { total: number; category: typeof transactions[0]['category'] }>);

  const sortedExpenses = Object.values(expensesByCategory).sort((a, b) => b.total - a.total);
  const maxExpense = sortedExpenses[0]?.total || 1;

  return (
    <AppLayout>
      <Header title="Relatórios" showBack />

      <main className="flex flex-col gap-6 p-6">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card p-5 rounded-2xl border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-success text-lg">trending_up</span>
              <span className="text-sm font-medium text-muted-foreground">Total Receitas</span>
            </div>
            <p className="text-2xl font-bold text-success">{formatCurrency(monthSummary.totalIncome)}</p>
          </div>
          <div className="bg-card p-5 rounded-2xl border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-destructive text-lg">trending_down</span>
              <span className="text-sm font-medium text-muted-foreground">Total Despesas</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(monthSummary.totalExpense)}</p>
          </div>
        </div>

        {/* Balance */}
        <div className="bg-gold-card p-6 rounded-2xl border border-accent/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Saldo do Mês</span>
            <span className="material-symbols-outlined text-accent">account_balance</span>
          </div>
          <p className={`text-3xl font-bold ${monthSummary.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(monthSummary.balance)}
          </p>
        </div>

        {/* Expenses by Category */}
        <div className="bg-card p-6 rounded-2xl border border-border/50">
          <h3 className="text-lg font-bold text-foreground mb-4">Despesas por Categoria</h3>
          <div className="flex flex-col gap-4">
            {sortedExpenses.map(({ total, category }) => (
              <div key={category?.id || 'unknown'} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="size-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${category?.color}20` }}
                    >
                      <span
                        className="material-symbols-outlined text-lg"
                        style={{ color: category?.color }}
                      >
                        {category?.icon || 'category'}
                      </span>
                    </div>
                    <span className="font-medium text-foreground">{category?.name || 'Sem categoria'}</span>
                  </div>
                  <span className="font-bold text-foreground">{formatCurrency(total)}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(total / maxExpense) * 100}%`,
                      backgroundColor: category?.color || '#64748B',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
