import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { addDays, parseISO, isBefore, isEqual, startOfDay, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { AlertTriangle, ChevronLeft, ChevronRight, Target, Wallet, Tags } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { fetchTransactions } from '@/services/transactionsService';
import { fetchAccounts } from '@/services/accountsService';
import { fetchCategories } from '@/services/categoriesService';
import { TransactionItem } from './TransactionItem';
import { TransactionWithBalance } from '@/types/finance';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
}

function PendingPanelContent() {
  const navigate = useNavigate();
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
  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    enabled: !!user,
    staleTime: isSimulation ? Infinity : 0,
  });

  const allTransactions = transactionsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const accounts = accountsQuery.data || [];

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
          onClick={() =>
            navigate('/transactions', { state: { selectedMonth: transaction.date } })
          }
        />
      ))}
    </div>
  );
}

function CategoriesSummaryContent({ selectedDate }: { selectedDate: Date }) {
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
    const monthTx = transactions.filter((t) =>
      isWithinInterval(parseISO(t.date), { start, end })
    );
    const map = new Map<string, number>();
    monthTx.forEach((t) => {
      map.set(t.categoryId, (map.get(t.categoryId) || 0) + t.amount);
    });
    return categories
      .map((c) => ({ category: c, total: map.get(c.id) || 0 }))
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [transactions, categories, selectedDate]);

  if (totals.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-6">Sem lançamentos no mês</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border/50">
      {totals.map(({ category, total }) => (
        <div key={category.id} className="flex items-center gap-3 py-2">
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
      ))}
    </div>
  );
}

function AccountsBalanceContent({ selectedDate }: { selectedDate: Date }) {
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
    const end = endOfMonth(selectedDate);
    return accounts.map((account) => {
      const accountTx = transactions.filter(
        (t) => t.accountId === account.id && t.isPaid && parseISO(t.date) <= end
      );
      const delta = accountTx.reduce(
        (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
        0
      );
      return { account, balance: account.initialBalance + delta };
    });
  }, [transactions, accounts, selectedDate]);

  if (balances.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-6">Nenhuma conta cadastrada</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border/50">
      {balances.map(({ account, balance }) => (
        <div key={account.id} className="flex items-center gap-3 py-2">
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
            <p className="text-[10px] text-muted-foreground">Saldo atual</p>
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
      ))}
    </div>
  );
}

function GoalsContent() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <Target className="h-8 w-8 text-muted-foreground/50" />
      <p className="text-xs text-muted-foreground">Metas em breve</p>
    </div>
  );
}

export function LeftSidePanel({
  selectedDate,
  expanded,
  onToggle,
}: { selectedDate: Date; expanded: boolean; onToggle: () => void }) {
  return (
    <SidePanelShell
      side="left"
      expanded={expanded}
      onToggle={onToggle}
      topTitle="Pendentes"
      topIcon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
      topContent={<PendingPanelContent />}
      bottomTitle="Categorias"
      bottomIcon={<Tags className="h-4 w-4 text-accent" />}
      bottomContent={<CategoriesSummaryContent selectedDate={selectedDate} />}
    />
  );
}

export function RightSidePanel({
  selectedDate,
  expanded,
  onToggle,
}: { selectedDate: Date; expanded: boolean; onToggle: () => void }) {
  return (
    <SidePanelShell
      side="right"
      expanded={expanded}
      onToggle={onToggle}
      topTitle="Contas"
      topIcon={<Wallet className="h-4 w-4 text-accent" />}
      topContent={<AccountsBalanceContent selectedDate={selectedDate} />}
      bottomTitle="Metas"
      bottomIcon={<Target className="h-4 w-4 text-accent" />}
      bottomContent={<GoalsContent />}
    />
  );
}
