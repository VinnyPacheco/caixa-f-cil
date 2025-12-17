import { formatCurrency } from '@/lib/format';

interface SummaryCardsProps {
  income: number;
  expense: number;
}

export function SummaryCards({ income, expense }: SummaryCardsProps) {
  return (
    <section className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm border border-border/50">
        <div className="size-10 flex items-center justify-center rounded-full bg-success/10">
          <span className="material-symbols-outlined text-success text-xl">arrow_downward</span>
        </div>
        <div>
          <p className="text-muted-foreground text-sm font-medium">Receitas</p>
          <p className="text-foreground text-lg font-bold tracking-tight">
            {formatCurrency(income)}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm border border-border/50">
        <div className="size-10 flex items-center justify-center rounded-full bg-destructive/10">
          <span className="material-symbols-outlined text-destructive text-xl">arrow_upward</span>
        </div>
        <div>
          <p className="text-muted-foreground text-sm font-medium">Despesas</p>
          <p className="text-foreground text-lg font-bold tracking-tight">
            {formatCurrency(expense)}
          </p>
        </div>
      </div>
    </section>
  );
}
