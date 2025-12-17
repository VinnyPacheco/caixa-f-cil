import { formatCurrency } from '@/lib/format';

interface BalanceCardProps {
  balance: number;
  percentChange?: number;
  onViewStatement?: () => void;
}

export function BalanceCard({ balance, percentChange = 0, onViewStatement }: BalanceCardProps) {
  const isPositive = percentChange >= 0;

  return (
    <section className="w-full">
      <div className="card-gold">
        <div className="relative z-10 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm font-medium">Saldo Total</p>
            <span className="material-symbols-outlined text-accent">account_balance_wallet</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mt-1">
            {formatCurrency(balance)}
          </h1>
          <div className="mt-6 flex items-center justify-between">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-card border shadow-sm ${
                isPositive ? 'border-success/20' : 'border-destructive/20'
              }`}
            >
              <span
                className={`material-symbols-outlined text-sm ${
                  isPositive ? 'text-success' : 'text-destructive'
                }`}
              >
                {isPositive ? 'trending_up' : 'trending_down'}
              </span>
              <span
                className={`text-xs font-medium ${
                  isPositive ? 'text-success' : 'text-destructive'
                }`}
              >
                {isPositive ? '+' : ''}
                {percentChange.toFixed(1)}% este mês
              </span>
            </div>
            {onViewStatement && (
              <button
                onClick={onViewStatement}
                className="text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
              >
                Ver extrato
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
