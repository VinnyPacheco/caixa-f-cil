import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Loader2, Plus, Trash2, Copy } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategoriesData';
import { useTransactions } from '@/hooks/useTransactions';
import { useToast } from '@/hooks/use-toast';
import { TransactionType, RecurrenceType } from '@/types/finance';

interface BulkRow {
  id: string;
  type: TransactionType;
  amountCents: number;
  description: string;
  categoryId: string;
  accountId: string;
  date: string; // yyyy-MM-dd
  installments: number; // 1..12
  isPaid: boolean;
}

const formatCents = (cents: number): string => {
  const value = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const makeEmptyRow = (defaults: Partial<BulkRow> = {}): BulkRow => ({
  id: crypto.randomUUID(),
  type: 'expense',
  amountCents: 0,
  description: '',
  categoryId: '',
  accountId: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  installments: 1,
  isPaid: false,
  ...defaults,
});

export default function BulkTransactions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { accounts, isLoading: loadingAccounts } = useAccounts();
  const { categories, isLoading: loadingCategories } = useCategories();
  const { addTransaction } = useTransactions(new Date());

  const primaryAccountId = useMemo(
    () => accounts.find((a) => a.isPrimary)?.id ?? accounts[0]?.id ?? '',
    [accounts],
  );

  const defaultCategoryFor = (type: TransactionType): string => {
    const outros = categories.find((c) => c.isSystem && c.name === 'Outros' && c.type === type);
    return outros?.id ?? categories.find((c) => c.type === type)?.id ?? '';
  };

  const [rows, setRows] = useState<BulkRow[]>(() => [makeEmptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize defaults once accounts/categories load
  useMemo(() => {
    if (!primaryAccountId || categories.length === 0) return;
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        accountId: r.accountId || primaryAccountId,
        categoryId: r.categoryId || defaultCategoryFor(r.type),
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryAccountId, categories.length]);

  const updateRow = (id: string, patch: Partial<BulkRow>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        // If type changed and category doesn't match, reset to default
        if (patch.type && patch.type !== r.type) {
          const cat = categories.find((c) => c.id === next.categoryId);
          if (!cat || cat.type !== patch.type) {
            next.categoryId = defaultCategoryFor(patch.type);
          }
        }
        return next;
      }),
    );
  };

  const addRow = () => {
    setRows((prev) => {
      const last = prev[prev.length - 1];
      return [
        ...prev,
        makeEmptyRow({
          accountId: last?.accountId || primaryAccountId,
          categoryId: defaultCategoryFor(last?.type || 'expense'),
          type: last?.type || 'expense',
          date: last?.date || format(new Date(), 'yyyy-MM-dd'),
        }),
      ];
    });
  };

  const duplicateRow = (id: string) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx === -1) return prev;
      const copy: BulkRow = { ...prev[idx], id: crypto.randomUUID() };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const removeRow = (id: string) => {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));
  };

  const handleAmountChange = (id: string, value: string) => {
    const digits = value.replace(/\D/g, '');
    updateRow(id, { amountCents: parseInt(digits, 10) || 0 });
  };

  const validRows = rows.filter(
    (r) => r.amountCents > 0 && r.description.trim() && r.categoryId && r.accountId && r.date,
  );

  const totalValid = validRows.length;
  const totalInvalid = rows.length - totalValid;

  const handleSubmit = async () => {
    if (totalValid === 0) {
      toast({
        title: 'Nenhum lançamento válido',
        description: 'Preencha valor, descrição, categoria, conta e data em pelo menos uma linha.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    let success = 0;
    let failed = 0;

    for (const row of validRows) {
      const numericAmount = row.amountCents / 100;
      const recurrence: RecurrenceType = row.installments > 1 ? 'installment' : 'once';
      try {
        await addTransaction({
          accountId: row.accountId,
          categoryId: row.categoryId,
          description: row.description.trim(),
          amount: numericAmount,
          date: row.date,
          type: row.type,
          isPaid: row.isPaid,
          recurrenceType: recurrence,
          installmentTotal: recurrence === 'installment' ? row.installments : undefined,
          installmentCurrent: recurrence === 'installment' ? 1 : undefined,
          autoSettle: false,
          startDate: row.date,
        });
        success++;
      } catch {
        failed++;
      }
    }

    setIsSubmitting(false);
    toast({
      title: failed === 0 ? 'Lançamentos criados' : 'Concluído com erros',
      description: `${success} salvo(s)${failed > 0 ? `, ${failed} com erro` : ''}.`,
      variant: failed > 0 ? 'destructive' : 'default',
    });

    if (success > 0) {
      navigate('/transactions');
    }
  };

  const isLoading = loadingAccounts || loadingCategories;

  if (isLoading) {
    return (
      <AppLayout>
        <Header title="Lançamentos em Massa" showBack onBack={() => navigate(-1)} />
        <div className="flex-1 flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Header title="Lançamentos em Massa" showBack onBack={() => navigate(-1)} />

      <main className="flex flex-col gap-4 p-4 md:p-6 pb-40">
        <p className="text-sm text-muted-foreground">
          Cadastre vários lançamentos de uma vez. Cada linha tem suas próprias informações.
        </p>

        <div className="flex flex-col gap-3">
          {rows.map((row, index) => {
            const rowCategories = categories.filter((c) => c.type === row.type);
            return (
              <div
                key={row.id}
                className="bg-card border border-border/50 rounded-2xl p-3 md:p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Lançamento {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => duplicateRow(row.id)}
                      className="size-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label="Duplicar linha"
                      title="Duplicar"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                      className="size-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                      aria-label="Remover linha"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Type toggle */}
                <div className="grid grid-cols-2 gap-1 bg-secondary/50 p-1 rounded-full mb-3">
                  <button
                    type="button"
                    onClick={() => updateRow(row.id, { type: 'expense' })}
                    className={`py-1.5 rounded-full text-xs font-bold transition-all ${
                      row.type === 'expense'
                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRow(row.id, { type: 'income' })}
                    className={`py-1.5 rounded-full text-xs font-bold transition-all ${
                      row.type === 'income'
                        ? 'bg-success/10 text-success border border-success/20'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Receita
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  {/* Amount */}
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Valor
                    </label>
                    <div className="flex items-center bg-background border border-border/50 rounded-lg px-2 mt-1">
                      <span
                        className={`text-sm font-bold mr-1 ${
                          row.type === 'expense' ? 'text-destructive' : 'text-success'
                        }`}
                      >
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formatCents(row.amountCents)}
                        onChange={(e) => handleAmountChange(row.id, e.target.value)}
                        className={`w-full bg-transparent py-2 text-right font-bold focus:outline-none ${
                          row.type === 'expense' ? 'text-destructive' : 'text-success'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-4">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Descrição
                    </label>
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => updateRow(row.id, { description: e.target.value })}
                      placeholder="Ex: Almoço"
                      className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  {/* Date */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Data
                    </label>
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRow(row.id, { date: e.target.value })}
                      className="w-full bg-background border border-border/50 rounded-lg px-2 py-2 mt-1 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  {/* Installments */}
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Parc.
                    </label>
                    <select
                      value={row.installments}
                      onChange={(e) =>
                        updateRow(row.id, { installments: parseInt(e.target.value, 10) })
                      }
                      className="w-full bg-background border border-border/50 rounded-lg px-2 py-2 mt-1 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}x
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div className="md:col-span-6">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Categoria
                    </label>
                    <select
                      value={row.categoryId}
                      onChange={(e) => updateRow(row.id, { categoryId: e.target.value })}
                      className="w-full bg-background border border-border/50 rounded-lg px-2 py-2 mt-1 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      {rowCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Account */}
                  <div className="md:col-span-4">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Conta
                    </label>
                    <select
                      value={row.accountId}
                      onChange={(e) => updateRow(row.id, { accountId: e.target.value })}
                      className="w-full bg-background border border-border/50 rounded-lg px-2 py-2 mt-1 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Paid */}
                  <div className="md:col-span-2 flex md:items-end">
                    <label className="flex items-center gap-2 w-full bg-background border border-border/50 rounded-lg px-3 py-2 mt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={row.isPaid}
                        onChange={(e) => updateRow(row.id, { isPaid: e.target.checked })}
                        className="size-4 accent-accent"
                      />
                      <span className="text-sm font-medium">Pago</span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 text-muted-foreground hover:text-accent font-semibold transition-colors"
        >
          <Plus className="w-5 h-5" />
          Adicionar lançamento
        </button>
      </main>

      {/* Sticky footer with summary + save */}
      <div className="fixed bottom-16 md:bottom-4 inset-x-0 z-40 px-4">
        <div className="max-w-4xl mx-auto bg-card border border-border/50 rounded-2xl shadow-lg p-3 flex items-center gap-3">
          <div className="flex-1 text-sm">
            <p className="font-semibold text-foreground">
              {totalValid} lançamento{totalValid === 1 ? '' : 's'} pronto{totalValid === 1 ? '' : 's'}
            </p>
            {totalInvalid > 0 && (
              <p className="text-xs text-muted-foreground">
                {totalInvalid} incompleto{totalInvalid === 1 ? '' : 's'} (será{totalInvalid === 1 ? '' : 'ão'} ignorado{totalInvalid === 1 ? '' : 's'})
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || totalValid === 0}
            className="rounded-xl bg-accent text-accent-foreground font-bold px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-95 transition flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>Salvar todos</>
            )}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}