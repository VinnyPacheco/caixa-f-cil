import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { useAccounts } from '@/hooks/useAccounts';
import { useProfile } from '@/hooks/useProfile';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactions } from '@/services/transactionsService';
import { fetchCategories } from '@/services/categoriesService';
import { useAuth } from '@/contexts/AuthContext';
import { groupTransactionsByInvoice, isInvoicePaid, toggleInvoicePaid } from '@/lib/creditCard';
import { formatCurrency } from '@/lib/format';
import { format, parseISO, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CreditCard, ArrowLeft, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function CreditCardInvoices() {
  const { accountId } = useParams<{ accountId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { displayName } = useProfile();
  const { user } = useAuth();
  const { accounts, isLoading: loadingAccounts } = useAccounts();
  const { toast } = useToast();

  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    enabled: !!user,
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: !!user,
  });

  const transactions = transactionsQuery.data || [];
  const categories = categoriesQuery.data || [];

  const card = accounts.find((a) => a.id === accountId && a.type === 'credit_card');

  // Selected invoice month (from ?mes= or current month)
  const monthParam = searchParams.get('mes');
  const initialMonth = monthParam ? parseISO(`${monthParam}-01`) : new Date();
  const [selectedMonth, setSelectedMonth] = useState<Date>(initialMonth);

  const grouped = useMemo(
    () => groupTransactionsByInvoice(transactions, accounts),
    [transactions, accounts],
  );

  const invoiceKey = card
    ? `invoice:${card.id}:${format(selectedMonth, 'yyyy-MM')}`
    : '';
  const invoice = grouped.get(invoiceKey);

  const [paidVersion, setPaidVersion] = useState(0);
  const paid = invoiceKey ? isInvoicePaid(invoiceKey) : false;

  const changeMonth = (delta: number) => {
    const next = delta > 0 ? addMonths(selectedMonth, 1) : subMonths(selectedMonth, 1);
    setSelectedMonth(next);
    setSearchParams({ mes: format(next, 'yyyy-MM') });
  };

  const handleTogglePaid = () => {
    if (!invoiceKey) return;
    const nowPaid = toggleInvoicePaid(invoiceKey);
    setPaidVersion((v) => v + 1);
    toast({
      title: nowPaid ? 'Fatura marcada como paga' : 'Fatura marcada como pendente',
    });
  };

  if (loadingAccounts || transactionsQuery.isLoading) {
    return (
      <AppLayout>
        <Header showAvatar userName={displayName} />
        <main className="p-6 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
        </main>
      </AppLayout>
    );
  }

  if (!card) {
    return (
      <AppLayout>
        <Header showAvatar userName={displayName} />
        <main className="p-6">
          <p className="text-sm text-muted-foreground">Cartão não encontrado.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/accounts"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Link>
          </Button>
        </main>
      </AppLayout>
    );
  }

  const debitAccount = accounts.find((a) => a.id === card.creditCardDebitAccountId);
  const totalSpentNow = invoice?.total ?? 0;
  const limitAvailable = card.creditLimit != null ? card.creditLimit - totalSpentNow : null;

  return (
    <AppLayout>
      <Header showAvatar userName={displayName} />
      <main className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link to="/accounts" aria-label="Voltar"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div className="flex items-center gap-2">
            <div
              className="size-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${card.color}20` }}
            >
              <CreditCard style={{ color: card.color }} className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{card.name}</h1>
              <p className="text-xs text-muted-foreground">
                Vence dia {card.dueDay ?? '-'} • Fecha dia {card.statementClosingDay ?? '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Month selector */}
        <div className="flex items-center justify-between bg-card border border-border/50 rounded-2xl p-3">
          <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Fatura de</p>
            <p className="text-base font-bold capitalize">
              {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => changeMonth(1)}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border/50 rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">Total da fatura</p>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(invoice?.total ?? 0)}
            </p>
            {debitAccount && (
              <p className="text-xs text-muted-foreground mt-1">
                Débito em <span className="font-semibold">{debitAccount.name}</span>
              </p>
            )}
          </div>
          <div className="bg-card border border-border/50 rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">Limite disponível</p>
            <p className="text-2xl font-bold">
              {limitAvailable != null ? formatCurrency(limitAvailable) : '—'}
            </p>
            {card.creditLimit != null && (
              <p className="text-xs text-muted-foreground mt-1">
                Limite total {formatCurrency(card.creditLimit)}
              </p>
            )}
          </div>
        </div>

        {invoice && (
          <Button onClick={handleTogglePaid} variant={paid ? 'outline' : 'default'} className={paid ? '' : 'btn-gold'}>
            <Check className="w-4 h-4 mr-1" />
            {paid ? 'Marcar como pendente' : 'Marcar fatura como paga'}
          </Button>
        )}

        {/* Transactions list */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 ml-1">
            Lançamentos do ciclo
          </p>
          {!invoice || invoice.transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center bg-card border border-border/50 rounded-2xl">
              Nenhum lançamento neste ciclo.
            </p>
          ) : (
            <div className="bg-card border border-border/50 rounded-2xl divide-y divide-border/50">
              {invoice.transactions
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((t) => {
                  const cat = categories.find((c) => c.id === t.categoryId);
                  const isRefund = t.type === 'income';
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground line-clamp-1">
                          {t.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(t.date), "dd 'de' MMM", { locale: ptBR })}
                          {cat && ` • ${cat.name}`}
                        </p>
                      </div>
                      <p className={`text-sm font-bold ${isRefund ? 'text-success' : 'text-destructive'}`}>
                        {isRefund ? '+ ' : '- '}
                        {formatCurrency(t.amount)}
                      </p>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}