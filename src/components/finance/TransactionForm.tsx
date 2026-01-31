import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Transaction, TransactionType, RecurrenceType, Category, Account } from '@/types/finance';
import { Tag } from '@/types/tag';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Copy, Trash2 } from 'lucide-react';
import { RecurringActionDialog, RecurringActionType } from './RecurringActionDialog';
import { TagSelector } from './TagSelector';
import { useTags, useTransactionTags } from '@/hooks/useTags';

export type RecurringUpdateAction = {
  type: RecurringActionType;
  instanceDate: string;
};

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  categories: Category[];
  accounts: Account[];
  onSave: (transaction: Omit<Transaction, 'id' | 'orderIndex'>, tagIds?: string[]) => void;
  onUpdate?: (id: string, transaction: Partial<Transaction>, recurringAction?: RecurringUpdateAction, tagIds?: string[]) => void;
  onDelete?: (id: string, recurringAction?: RecurringUpdateAction) => void;
}

export function TransactionForm({
  open,
  onOpenChange,
  transaction,
  categories,
  accounts,
  onSave,
  onUpdate,
  onDelete,
}: TransactionFormProps) {
  const { toast } = useToast();
  const isEditing = !!transaction;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [recurringActionType, setRecurringActionType] = useState<'edit' | 'delete'>('edit');
  const [pendingSubmitData, setPendingSubmitData] = useState<Partial<Transaction> | null>(null);

  // Tags
  const { tags: availableTags, findOrCreateTag } = useTags();
  const { tags: transactionTags } = useTransactionTags(transaction?.id);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  // Check if this is an installment transaction
  const isInstallment = transaction?.recurrenceType === 'installment';
  const needsRecurringAction = isInstallment;
  const [type, setType] = useState<TransactionType>('expense');
  const [amountCents, setAmountCents] = useState(0);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [installmentCount, setInstallmentCount] = useState('1');
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

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Extract only digits from input
    const digits = e.target.value.replace(/\D/g, '');
    setAmountCents(parseInt(digits, 10) || 0);
  };

  // Parse date string (yyyy-MM-dd) to Date without timezone issues
  const parseDateString = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  useEffect(() => {
    if (transaction) {
      const parsedDate = parseDateString(transaction.date);
      setType(transaction.type);
      setAmountCents(Math.round(transaction.amount * 100));
      setDescription(transaction.description);
      setCategoryId(transaction.categoryId);
      setAccountId(transaction.accountId);
      setDate(parsedDate);
      setCalendarMonth(parsedDate);
      setInstallmentCount(transaction.installmentTotal?.toString() || '1');
      setIsPaid(transaction.isPaid);
      setAutoSettle(transaction.autoSettle || false);
      setNotes(transaction.notes || '');
    } else {
      const today = new Date();
      setType('expense');
      setAmountCents(0);
      setDescription('');
      setCategoryId('');
      setAccountId(accounts[0]?.id || '');
      setDate(today);
      setCalendarMonth(today);
      setInstallmentCount('1');
      setIsPaid(false);
      setAutoSettle(false);
      setNotes('');
      setSelectedTags([]);
    }
  }, [transaction, accounts, open]);

  // Load transaction tags when editing
  useEffect(() => {
    if (transactionTags.length > 0) {
      setSelectedTags(transactionTags);
    }
  }, [transactionTags]);

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
    const installments = parseInt(installmentCount) || 1;
    const isInstallmentTransaction = installments > 1;

    const transactionData = {
      type,
      amount: numericAmount,
      description,
      categoryId: categoryId || filteredCategories[0]?.id || '',
      accountId: accountId || accounts[0]?.id || '',
      date: format(date, 'yyyy-MM-dd'),
      recurrenceType: isInstallmentTransaction ? 'installment' as RecurrenceType : 'once' as RecurrenceType,
      isPaid,
      autoSettle,
      notes: notes.trim() || undefined,
      installmentTotal: isInstallmentTransaction ? installments : undefined,
      installmentCurrent: isInstallmentTransaction ? 1 : undefined,
      startDate: isInstallmentTransaction ? format(date, 'yyyy-MM-dd') : undefined,
    };

    const tagIds = selectedTags.map(t => t.id);

    if (isEditing && onUpdate) {
      if (needsRecurringAction) {
        // Show recurring action dialog for recurring/installment transactions
        setPendingSubmitData(transactionData);
        setRecurringActionType('edit');
        setShowRecurringDialog(true);
      } else {
        // For one-time transactions, update directly
        onUpdate(transaction.id, transactionData, undefined, tagIds);
        toast({
          title: 'Lançamento atualizado!',
          description: `${type === 'income' ? 'Receita' : 'Despesa'} atualizada com sucesso.`,
        });
        onOpenChange(false);
      }
    } else {
      onSave(transactionData, tagIds);
      toast({
        title: 'Lançamento salvo!',
        description: `${type === 'income' ? 'Receita' : 'Despesa'} de R$ ${formatAmountDisplay(amountCents)} registrada com sucesso.`,
      });
      onOpenChange(false);
    }
  };

  const handleRecurringAction = (action: RecurringActionType) => {
    if (!transaction) return;

    const instanceDate = transaction.date;
    // Use the actual transaction ID directly (no more virtual IDs)
    const transactionId = transaction.id;

    const tagIds = selectedTags.map(t => t.id);

    if (recurringActionType === 'delete' && onDelete) {
      onDelete(transactionId, { type: action, instanceDate });
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } else if (recurringActionType === 'edit' && onUpdate && pendingSubmitData) {
      onUpdate(transactionId, pendingSubmitData, { type: action, instanceDate }, tagIds);
      toast({
        title: 'Lançamento atualizado!',
        description: `${type === 'income' ? 'Receita' : 'Despesa'} atualizada com sucesso.`,
      });
      setPendingSubmitData(null);
      onOpenChange(false);
    }
  };

  const handleAddTag = (tag: Tag) => {
    if (!selectedTags.some(t => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter(t => t.id !== tagId));
  };

  const handleCreateTag = async (name: string, color: string): Promise<Tag> => {
    return findOrCreateTag({ name, color });
  };

  const handleDeleteClick = () => {
    if (needsRecurringAction) {
      setRecurringActionType('delete');
      setShowRecurringDialog(true);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleSimpleDelete = () => {
    if (transaction && onDelete) {
      // Use the actual transaction ID directly (no more virtual IDs)
      onDelete(transaction.id);
      setShowDeleteConfirm(false);
      onOpenChange(false);
    }
  };

  return (
    <>
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
                inputMode="decimal"
                value={formatAmountDisplay(amountCents)}
                onChange={handleAmountChange}
                className={`w-full max-w-[200px] bg-transparent border-none p-0 text-4xl font-bold text-center focus:ring-0 focus:outline-none leading-tight cursor-text ${type === 'expense' ? 'text-destructive' : 'text-success'}`}
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
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                locale={ptBR}
                className="rounded-md pointer-events-auto"
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

          {/* Installment Count - Always visible */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
              Número de Parcelas
            </label>
            {isEditing ? (
              <div className="bg-secondary/50 p-4 rounded-xl">
                <span className="text-foreground text-sm font-medium">
                  {installmentCount}x
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setInstallmentCount(count)}
                    className={`py-3 px-2 rounded-xl font-semibold text-sm transition-all ${
                      installmentCount === count
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'bg-secondary text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {count}x
                  </button>
                ))}
              </div>
            )}
            {!isEditing && (
              <div className="flex items-center gap-3 bg-secondary p-4 rounded-xl mt-2">
                <span className="material-symbols-outlined text-muted-foreground">format_list_numbered</span>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(e.target.value)}
                  placeholder="Ou digite..."
                  className="w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-foreground placeholder-muted-foreground text-base font-medium"
                />
                <span className="text-muted-foreground text-sm">parcelas</span>
              </div>
            )}
          </div>

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

          {/* Tags */}
          <TagSelector
            selectedTags={selectedTags}
            availableTags={availableTags}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            onCreateTag={handleCreateTag}
          />

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

          {/* Delete Button - Only show when editing */}
          {isEditing && onDelete && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-semibold"
            >
              <Trash2 className="w-5 h-5" />
              Excluir Lançamento
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog - For non-recurring transactions */}
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSimpleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Recurring Action Dialog - For recurring/installment transactions */}
    <RecurringActionDialog
      open={showRecurringDialog}
      onOpenChange={setShowRecurringDialog}
      onAction={handleRecurringAction}
      actionType={recurringActionType}
      isInstallment={isInstallment}
    />
    </>
  );
}
