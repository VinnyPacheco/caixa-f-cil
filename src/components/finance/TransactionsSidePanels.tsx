import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays, parseISO, isBefore, isEqual, startOfDay, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { AlertTriangle, ChevronLeft, ChevronRight, Target, Wallet, Tags, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { fetchTransactions, toggleTransactionPaid } from '@/services/transactionsService';
import { fetchAccounts } from '@/services/accountsService';
import { fetchCategories } from '@/services/categoriesService';
import { TransactionItem } from './TransactionItem';
import { GoalsWidget } from './GoalsWidget';
import { TransactionWithBalance } from '@/types/finance';
import type { FilterType } from './FilterPills';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { buildInvoiceTransactions } from '@/lib/creditCard';

interface FilterState {
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  hasSelection: boolean;
}

interface SidePanelShellProps {
  side: 'left' | 'right';
  expanded: boolean;
  onToggle: () => void;
  topTitle: string;
  topIcon: React.ReactNode;
  topContent: React.ReactNode;
  bottomTitle: string;
  bottomIcon: React.ReactNode;
  bottomContent: React.ReactNode;
}

function SidePanelShell({
  side,
  expanded,
  onToggle,
  topTitle,
  topIcon,
  topContent,
  bottomTitle,
  bottomIcon,
  bottomContent,
}: SidePanelShellProps) {
  const ToggleIcon = expanded
    ? (side === 'left' ? ChevronLeft : ChevronRight)
    : (side === 'left' ? ChevronRight : ChevronLeft);

  if (!expanded) {
    return (
      <div className="flex flex-col items-center bg-card/50 border border-border/50 rounded-2xl p-2 gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
          title="Expandir painel"
        >
          <ToggleIcon className="h-4 w-4" />
        </Button>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-muted-foreground">
          <div className="flex flex-col items-center gap-2 [writing-mode:vertical-rl] rotate-180">
            <span className="text-xs font-bold uppercase tracking-wider">{topTitle}</span>
          </div>
          <div className="flex flex-col items-center gap-2 [writing-mode:vertical-rl] rotate-180">
            <span className="text-xs font-bold uppercase tracking-wider">{bottomTitle}</span>
          </div>
        </div>
      </div>
    );
  }

  const Section = ({
    title,
    icon,
    children,
  }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="flex flex-col bg-card border border-border/50 rounded-2xl overflow-hidden min-h-0 flex-1">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 shrink-0">
        {icon}
        <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3">{children}</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 min-w-0 max-h-[calc(100vh-220px)]">
      <div className={cn('flex', side === 'left' ? 'justify-end' : 'justify-start')}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-7 w-7"
          title="Recolher painel"
        >
          <ToggleIcon className="h-4 w-4" />
        </Button>
      </div>
      <Section title={topTitle} icon={topIcon}>{topContent}</Section>
      <Section title={bottomTitle} icon={bottomIcon}>{bottomContent}</Section>
    </div>
  );
}

interface PanelsProps {
  selectedDate: Date;
  leftExpanded: boolean;
  rightExpanded: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  categoryFilter?: FilterState;
  accountFilter?: FilterState;
}

function applyActiveFilter(txs: TransactionWithBalance[], activeFilter?: FilterType) {
  if (!activeFilter || activeFilter === 'all') return txs;
  switch (activeFilter) {
    case 'pending':
    case 'scheduled':
      return txs.filter((t) => !t.isPaid);
    case 'paid':
      return txs.filter((t) => t.isPaid);
    case 'income':
      return txs.filter((t) => t.type === 'income');
    case 'expense':
      return txs.filter((t) => t.type === 'expense');
    default:
      return txs;
  }
}

function PendingPanelContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSimulation } = useSimulation();
  const queryClient = useQueryClient();

  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    enabled: !!user,
    staleTime: isSimulation ? Infinity : 0,
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: !!user,
    staleTime: isSimulation ? Infinity : 0,
  });
  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    enabled: !!user,
    staleTime: isSimulation ? Infinity : 0,
  });

  const allTransactions = transactionsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const accounts = accountsQuery.data || [];

  const togglePaidMutation = useMutation({
    mutationFn: ({ id, isPaid }: { id: string; isPaid: boolean }) =>
      toggleTransactionPaid(id, isPaid),
    onMutate: async ({ id, isPaid }) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const previous = queryClient.getQueryData<typeof allTransactions>(['transactions']);
      queryClient.setQueryData<typeof allTransactions>(['transactions'], (old) =>
        (old || []).map((t) => (t.id === id ? { ...t, isPaid } : t))
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['transactions'], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['multi-month-transactions'] });
    },
  });

  const handleTogglePaid = (id: string) => {
    const tx = allTransactions.find((t) => t.id === id);
    if (!tx) return;
    togglePaidMutation.mutate({ id, isPaid: !tx.isPaid });
  };

  const pendingUrgent: TransactionWithBalance[] = useMemo(() => {
    const today = startOfDay(new Date());
    const threshold = addDays(today, 3);
    return allTransactions
      .filter((t) => {
        if (t.isPaid) return false;
        const txDate = startOfDay(parseISO(t.date));
        return isBefore(txDate, threshold) || isEqual(txDate, threshold);
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t) => ({
        ...t,
        runningBalance: 0,
        category: categories.find((c) => c.id === t.categoryId),
        account: accounts.find((a) => a.id === t.accountId),
      }));
  }, [allTransactions, categories, accounts]);

  if (pendingUrgent.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-6">Nenhum lançamento pendente 🎉</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {pendingUrgent.map((transaction) => (
        <TransactionItem
          key={transaction.id}
          transaction={transaction}
          showDragHandle={false}
          showBalance={false}
          showDate={true}
          onTogglePaid={handleTogglePaid}
          onClick={() =>
            navigate('/transactions', { state: { selectedMonth: transaction.date } })
          }
        />
      ))}
    </div>
  );
}

function CategoriesSummaryContent({ selectedDate, filter, activeFilter }: { selectedDate: Date; filter?: FilterState; activeFilter?: FilterType }) {
  const { user } = useAuth();
  const { isSimulation } = useSimulation();

  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    enabled: !!user,
    staleTime: isSimulation ? Infinity : 0,
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: !!user,
    staleTime: isSimulation ? Infinity : 0,
  });

  const transactions = transactionsQuery.data || [];
  const categories = categoriesQuery.data || [];

  const totals = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    const monthTx = applyActiveFilter(
      transactions.filter((t) =>
        isWithinInterval(parseISO(t.date), { start, end })
      ) as TransactionWithBalance[],
      activeFilter,
    );
    const map = new Map<string, number>();
    monthTx.forEach((t) => {
      map.set(t.categoryId, (map.get(t.categoryId) || 0) + t.amount);
    });
    return categories
      .map((c) => ({ category: c, total: map.get(c.id) || 0 }))
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [transactions, categories, selectedDate, activeFilter]);

  if (totals.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-6">Sem lançamentos no mês</p>;
  }

  return (
    <div className="flex flex-col">
      {filter?.hasSelection && (
        <button
          onClick={filter.onClear}
          className="flex items-center gap-1.5 text-[10px] text-accent mb-2 hover:underline self-start"
        >
          <X className="h-3 w-3" />
          Limpar filtro
        </button>
      )}
      <div className="flex flex-col divide-y divide-border/50">
        {totals.map(({ category, total }) => {
          const isSelected = filter?.selectedIds.includes(category.id);
          return (
            <div
              key={category.id}
              onClick={() => filter?.onToggle(category.id)}
              className={cn(
                'flex items-center gap-3 py-2 px-1 -mx-1 rounded-lg cursor-pointer transition-colors',
                isSelected ? 'bg-accent/15 ring-1 ring-accent/40' : 'hover:bg-muted/50'
              )}
            >
              <div
                className="size-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${category.color}20` }}
              >
                <span className="material-symbols-outlined text-sm" style={{ color: category.color }}>
                  {category.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{category.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {category.type === 'expense' ? 'Despesa' : 'Receita'}
                </p>
              </div>
              <p
                className={cn(
                  'text-sm font-bold',
                  category.type === 'expense' ? 'text-destructive' : 'text-success'
                )}
              >
                {formatCurrency(total)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AccountsBalanceContent({ selectedDate, filter, activeFilter }: { selectedDate: Date; filter?: FilterState; activeFilter?: FilterType }) {
  const { user } = useAuth();
  const { isSimulation } = useSimulation();

  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    enabled: !!user,
    staleTime: isSimulation ? Infinity : 0,
  });
  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    enabled: !!user,
    staleTime: isSimulation ? Infinity : 0,
  });

  const transactions = transactionsQuery.data || [];
  const accounts = accountsQuery.data || [];

  const balances = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    const isFiltered = !!activeFilter && activeFilter !== 'all';
    // Virtual credit-card invoice payments debited into their linked account.
    const invoiceTxs = buildInvoiceTransactions(
      transactions as TransactionWithBalance[],
      accounts,
    );
    return accounts.map((account) => {
      if (isFiltered) {
        // When a filter is active, show the signed sum of matching transactions in the current month.
        const combined = [...(transactions as TransactionWithBalance[]), ...invoiceTxs];
        const monthTx = applyActiveFilter(
          combined.filter(
            (t) =>
              t.accountId === account.id &&
              isWithinInterval(parseISO(t.date), { start, end }),
          ),
          activeFilter,
        );
        const total = monthTx.reduce(
          (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
          0,
        );
        return { account, balance: total, isFiltered: true };
      }
      const combined = [...(transactions as TransactionWithBalance[]), ...invoiceTxs];
      const accountTx = combined.filter(
        (t) => t.accountId === account.id && t.isPaid && parseISO(t.date) <= end,
      );
      const delta = accountTx.reduce(
        (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
        0,
      );
      return { account, balance: account.initialBalance + delta, isFiltered: false };
    }).sort((a, b) => b.balance - a.balance);
  }, [transactions, accounts, selectedDate, activeFilter]);

  if (balances.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-6">Nenhuma conta cadastrada</p>;
  }

  return (
    <div className="flex flex-col">
      {filter?.hasSelection && (
        <button
          onClick={filter.onClear}
          className="flex items-center gap-1.5 text-[10px] text-accent mb-2 hover:underline self-start"
        >
          <X className="h-3 w-3" />
          Limpar filtro
        </button>
      )}
      <div className="flex flex-col divide-y divide-border/50">
        {balances.map(({ account, balance, isFiltered }) => {
          const isSelected = filter?.selectedIds.includes(account.id);
          return (
            <div
              key={account.id}
              onClick={() => filter?.onToggle(account.id)}
              className={cn(
                'flex items-center gap-3 py-2 px-1 -mx-1 rounded-lg cursor-pointer transition-colors',
                isSelected ? 'bg-accent/15 ring-1 ring-accent/40' : 'hover:bg-muted/50'
              )}
            >
              <div
                className="size-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${account.color}20` }}
              >
                <span className="material-symbols-outlined text-sm" style={{ color: account.color }}>
                  {account.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{account.name}</p>
                <p className="text-[10px] text-muted-foreground">{isFiltered ? 'Total filtrado' : 'Saldo atual'}</p>
              </div>
              <p
                className={cn(
                  'text-sm font-bold',
                  balance >= 0 ? 'text-foreground' : 'text-destructive'
                )}
              >
                {formatCurrency(balance)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GoalsContent({ selectedDate }: { selectedDate: Date }) {
  return <GoalsWidget referenceDate={selectedDate} variant="panel" limit={5} />;
}

export function LeftSidePanel({
  selectedDate,
  expanded,
  onToggle,
  categoryFilter,
  accountFilter,
  activeFilter,
}: { selectedDate: Date; expanded: boolean; onToggle: () => void; categoryFilter?: FilterState; accountFilter?: FilterState; activeFilter?: FilterType }) {
  return (
    <SidePanelShell
      side="left"
      expanded={expanded}
      onToggle={onToggle}
      topTitle="Categorias"
      topIcon={<Tags className="h-4 w-4 text-accent" />}
      topContent={<CategoriesSummaryContent selectedDate={selectedDate} filter={categoryFilter} activeFilter={activeFilter} />}
      bottomTitle="Contas"
      bottomIcon={<Wallet className="h-4 w-4 text-accent" />}
      bottomContent={<AccountsBalanceContent selectedDate={selectedDate} filter={accountFilter} activeFilter={activeFilter} />}
    />
  );
}

export function RightSidePanel({
  selectedDate,
  expanded,
  onToggle,
  activeFilter,
}: { selectedDate: Date; expanded: boolean; onToggle: () => void; activeFilter?: FilterType }) {
  return (
    <SidePanelShell
      side="right"
      expanded={expanded}
      onToggle={onToggle}
      topTitle="Pendentes"
      topIcon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
      topContent={<PendingPanelContent />}
      bottomTitle="Metas"
      bottomIcon={<Target className="h-4 w-4 text-accent" />}
      bottomContent={<GoalsContent selectedDate={selectedDate} />}
    />
  );
}
