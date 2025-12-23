import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Transaction, TransactionType, RecurrenceType, Category, Account } from '@/types/finance';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Copy } from 'lucide-react';

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  categories: Category[];
  accounts: Account[];
  onSave: (transaction: Omit<Transaction, 'id' | 'orderIndex'>) => void;
  onUpdate?: (id: string, transaction: Partial<Transaction>) => void;
}

export function TransactionForm({
  open,
  onOpenChange,
  transaction,
  categories,
  accounts,
  onSave,
  onUpdate,
}: TransactionFormProps) {
  const { toast } = useToast();
  const isEditing = !!transaction;

  const [type, setType] = useState<TransactionType>('expense');
  const [amountCents, setAmountCents] = useState(0);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date());
  const [recurrence, setRecurrence] = useState<RecurrenceType>('once');
  const [installmentCount, setInstallmentCount] = useState('2');
  const [isPaid, setIsPaid] = useState(false);
  const [autoSettle, setAutoSettle] = useState(false);
  const [notes, setNotes] = useState('');

  // Format amount from cents to display string with thousand separators
  const formatAmountDisplay = (cents: number): string => {
    const value = cents / 100;
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow only digits and backspace/delete
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      setAmountCents((prev) => Math.floor(prev / 10));
      return;
    }
    
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    
    e.preventDefault();
    const digit = parseInt(e.key, 10);
    setAmountCents((prev) => prev * 10 + digit);
  };

  // Parse date string (yyyy-MM-dd) to Date without timezone issues
  const parseDateString = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmountCents(Math.round(transaction.amount * 100));
      setDescription(transaction.description);
      setCategoryId(transaction.categoryId);
      setAccountId(transaction.accountId);
      setDate(parseDateString(transaction.date));
      setRecurrence(transaction.recurrenceType);
      setInstallmentCount(transaction.installmentTotal?.toString() || '2');
      setIsPaid(transaction.isPaid);
      setAutoSettle(transaction.autoSettle || false);
      setNotes(transaction.notes || '');
    } else {
      setType('expense');
      setAmountCents(0);
      setDescription('');
      setCategoryId('');
      setAccountId(accounts[0]?.id || '');
      setDate(new Date());
      setRecurrence('once');
      setInstallmentCount('2');
      setIsPaid(false);
      setAutoSettle(false);
      setNotes('');
    }
  }, [transaction, accounts, open]);

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = () => {
    if (amountCents === 0 || !description) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o valor e a descrição do lançamento.',
        variant: 'destructive',
      });
      return;
    }

    const numericAmount = amountCents / 100;
    const installments = recurrence === 'installment' ? parseInt(installmentCount) || 2 : undefined;

    const transactionData = {
      type,
      amount: numericAmount,
      description,
      categoryId: categoryId || filteredCategories[0]?.id || '',
      accountId: accountId || accounts[0]?.id || '',
      date: format(date, 'yyyy-MM-dd'),
      recurrenceType: recurrence,
      isPaid,
      autoSettle,
      notes: notes.trim() || undefined,
      installmentTotal: installments,
      installmentCurrent: installments ? 1 : undefined,
      startDate: recurrence !== 'once' ? format(date, 'yyyy-MM-dd') : undefined,
    };

    if (isEditing && onUpdate) {
      onUpdate(transaction.id, transactionData);
      toast({
        title: 'Lançamento atualizado!',
        description: `${type === 'income' ? 'Receita' : 'Despesa'} atualizada com sucesso.`,
      });
    } else {
      onSave(transactionData);
      toast({
        title: 'Lançamento salvo!',
        description: `${type === 'income' ? 'Receita' : 'Despesa'} de R$ ${formatAmountDisplay(amountCents)} registrada com sucesso.`,
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-4">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-secondary p-1.5 rounded-full">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-full font-bold text-sm transition-all ${
                type === 'expense'
                  ? 'bg-destructive/10 text-destructive shadow-sm border border-destructive/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-full font-bold text-sm transition-all ${
                type === 'income'
                  ? 'bg-success/10 text-success shadow-sm border border-success/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
              Receita
            </button>
          </div>

          {/* Amount Input */}
          <div className="flex flex-col items-center justify-center py-2">
            <p className="text-muted-foreground text-sm font-medium mb-1">Valor do lançamento</p>
            <div className="flex items-center justify-center w-full">
              <span className={`text-2xl font-bold mr-1 self-center pb-1 ${type === 'expense' ? 'text-destructive' : 'text-success'}`}>R$</span>
              <input
                type="text"
                inputMode="numeric"
                value={formatAmountDisplay(amountCents)}
                onKeyDown={handleAmountKeyDown}
                readOnly
                className={`w-full max-w-[200px] bg-transparent border-none p-0 text-4xl font-bold text-center focus:ring-0 focus:outline-none leading-tight cursor-text caret-transparent ${type === 'expense' ? 'text-destructive' : 'text-success'}`}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
              Descrição
            </label>
            <div className="flex items-center gap-3 bg-secondary p-4 rounded-xl">
              <span className="material-symbols-outlined text-muted-foreground">edit</span>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Compras no mercado"
                className="w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-foreground placeholder-muted-foreground text-base font-medium"
              />
            </div>
          </div>

          {/* Date with Calendar */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
              Data
            </label>
            <div className="flex justify-center bg-secondary p-3 rounded-xl">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                locale={ptBR}
                className="rounded-md"
              />
            </div>
          </div>

          {/* Category and Account */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                Categoria
              </label>
              <div className="bg-secondary p-4 rounded-xl">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-foreground text-sm font-medium appearance-none cursor-pointer"
                >
                  <option value="">Selecione</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                Conta
              </label>
              <div className="bg-secondary p-4 rounded-xl">
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-foreground text-sm font-medium appearance-none cursor-pointer"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Recurrence - Read-only when editing */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
              Recorrência
            </label>
            {isEditing ? (
              <div className="bg-secondary/50 p-4 rounded-xl">
                <span className="text-foreground text-sm font-medium">
                  {recurrence === 'once' ? 'Única' : recurrence === 'installment' ? 'Parcelada' : 'Contínua'}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {(['once', 'installment', 'recurring'] as RecurrenceType[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRecurrence(r)}
                    className={`py-3 px-2 rounded-xl font-semibold text-sm transition-all ${
                      recurrence === r
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'bg-secondary text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {r === 'once' ? 'Única' : r === 'installment' ? 'Parcelada' : 'Contínua'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Installment Count - Only show when installment is selected and not editing */}
          {recurrence === 'installment' && !isEditing && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                Número de Parcelas
              </label>
              <div className="flex items-center gap-3 bg-secondary p-4 rounded-xl">
                <span className="material-symbols-outlined text-muted-foreground">format_list_numbered</span>
                <input
                  type="number"
                  min="2"
                  max="60"
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(e.target.value)}
                  placeholder="Ex: 12"
                  className="w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-foreground placeholder-muted-foreground text-base font-medium"
                />
                <span className="text-muted-foreground text-sm">parcelas</span>
              </div>
            </div>
          )}

          {/* Auto Settle Toggle */}
          <div className="flex items-center justify-between bg-secondary p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-card text-accent">
                <span className="material-symbols-outlined text-[20px]">schedule</span>
              </div>
              <span className="text-base font-semibold text-foreground">Baixa Automática</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoSettle}
                onChange={(e) => setAutoSettle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>

          {/* Paid Status Toggle */}
          <div className="flex items-center justify-between bg-secondary p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-card text-accent">
                <span className="material-symbols-outlined text-[20px]">task_alt</span>
              </div>
              <span className="text-base font-semibold text-foreground">Pago/Recebido</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Observações
              </label>
              {notes && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(notes);
                    toast({
                      title: 'Copiado!',
                      description: 'Observações copiadas para a área de transferência.',
                    });
                  }}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Copiar observações"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="bg-secondary p-4 rounded-xl">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione observações sobre este lançamento..."
                rows={3}
                className="w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-foreground placeholder-muted-foreground text-sm font-medium resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full btn-gold flex items-center justify-center gap-2 mt-2"
          >
            <span className="material-symbols-outlined icon-filled">check_circle</span>
            {isEditing ? 'Salvar Alterações' : 'Salvar Lançamento'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
