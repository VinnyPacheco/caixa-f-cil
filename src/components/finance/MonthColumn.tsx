import { MonthData } from '@/hooks/useMultiMonthTransactions';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReadOnlyTransactionList } from './ReadOnlyTransactionList';

interface MonthColumnProps {
  monthData: MonthData;
  sortOrder: 'asc' | 'desc';
}

export function MonthColumn({ monthData, sortOrder }: MonthColumnProps) {
  const monthLabel = format(monthData.date, 'MMMM', { locale: ptBR });
  const yearLabel = format(monthData.date, 'yyyy');

  return (
    <div className="flex flex-col gap-4 min-w-0">
      {/* Month Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground capitalize">{monthLabel}</h3>
          <p className="text-xs text-muted-foreground">{yearLabel}</p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="flex items-center justify-between bg-card/50 p-3 rounded-xl border border-border/30">
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

      {/* Transactions List */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-350px)]">
        <ReadOnlyTransactionList
          transactions={monthData.transactions}
          sortOrder={sortOrder}
        />
      </div>
    </div>
  );
}
