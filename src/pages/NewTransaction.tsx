import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { TransactionType, RecurrenceType } from '@/types/finance';
import { Tag } from '@/types/tag';
import { useToast } from '@/hooks/use-toast';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategoriesData';
import { useTransactions } from '@/hooks/useTransactions';
import { useVoiceSettings } from '@/contexts/VoiceSettingsContext';
import { useTags } from '@/hooks/useTags';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Copy, Loader2, CheckCircle, CalendarCheck } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { TagSelector } from '@/components/finance/TagSelector';
import { 
  parseVoiceTransaction, 
  matchCategoryByName, 
  matchAccountByName 
} from '@/utils/parseVoiceTransaction';

interface LocationState {
  voiceText?: string;
}

// Confirmation sound as base64 (short beep)
const CONFIRMATION_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU4GAACBhYqFbF1fdH2Onp6TgXBndYKRoZ+XiHlwa3yKl6CdkYN0bHqGk5ycmIx+dHN+iZKYl5KId3R1fIeQlZWRiXx2dXyFjpKSkIx/eHd8hIyQkI2JgXp4fIOMjo6LhoB7eH2DioqKh4R/fXx/goaHh4WDgX99foGDhYWEg4GAfn+AgoSDg4KBgH9/gIGCgoKBgIB/f4CAgYGBgICAf3+AgIGBgYCAgH9/gICBgYGAgIB/f4CAgYGBgICAfn+AgIGBgYCAgH5/gICBgQ==';

const playConfirmationSound = () => {
  try {
    const audio = new Audio(CONFIRMATION_SOUND_URL);
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Ignore errors (user may not have interacted with page yet)
    });
  } catch (error) {
    console.log('Could not play sound:', error);
  }
};

export default function NewTransaction() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { accounts, isLoading: isLoadingAccounts } = useAccounts();
  const { categories, isLoading: isLoadingCategories } = useCategories();
  const { addTransaction } = useTransactions(new Date());
  const { autoSaveVoiceTransaction } = useVoiceSettings();
  const { tags: availableTags, findOrCreateTag } = useTags();
  
  const [type, setType] = useState<TransactionType>('expense');
  const [amountCents, setAmountCents] = useState(0);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  // Sempre exibir número de parcelas; 1x = lançamento único
  const [installmentCount, setInstallmentCount] = useState(1);
  const [autoPay, setAutoPay] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryInitialized, setCategoryInitialized] = useState(false);
  const [voiceProcessed, setVoiceProcessed] = useState(false);
  const autoSaveTriggeredRef = useRef(false);
  const voiceProcessedRef = useRef(false);

  const filteredCategories = categories.filter((c) => c.type === type);

  // Reset form to default values
  const resetForm = useCallback(() => {
    setType('expense');
    setAmountCents(0);
    setDescription('');
    setCategoryId('');
    setAccountId('');
    setDate(new Date());
    setInstallmentCount(1);
    setAutoPay(false);
    setNotes('');
    setSelectedTags([]);
    setCategoryInitialized(false);
    setVoiceProcessed(false);
    voiceProcessedRef.current = false;
    autoSaveTriggeredRef.current = false;
  }, []);

  // Handle close (X button or after save)
  const handleClose = useCallback(() => {
    resetForm();
    navigate(-1);
  }, [resetForm, navigate]);

  // Process voice input when available
  useEffect(() => {
    const state = location.state as LocationState | null;
    if (
      !state?.voiceText ||
      voiceProcessed ||
      voiceProcessedRef.current ||
      categories.length === 0 ||
      accounts.length === 0
    )
      return;

    console.log('Processing voice text:', state.voiceText);

    // Mark as processed synchronously (so other effects can't override voice-set values)
    voiceProcessedRef.current = true;
    setVoiceProcessed(true);

    // Toast 1: Show captured audio text
    toast({
      title: '🎤 Áudio capturado',
      description: state.voiceText,
    });

    const parsed = parseVoiceTransaction(state.voiceText, categories, accounts);
    console.log('Parsed transaction:', parsed);

    // Build fields summary for second toast
    const fieldsList: string[] = [];
    if (parsed.amount !== undefined) fieldsList.push(`Valor: R$ ${parsed.amount.toFixed(2)}`);
    if (parsed.description) fieldsList.push(`Descrição: ${parsed.description}`);
    if (parsed.date) fieldsList.push(`Data: ${format(parsed.date, 'dd/MM/yyyy', { locale: ptBR })}`);
    if (parsed.categoryName) fieldsList.push(`Categoria: ${parsed.categoryName}`);
    if (parsed.accountName) fieldsList.push(`Conta: ${parsed.accountName}`);
    if (parsed.type) fieldsList.push(`Tipo: ${parsed.type === 'expense' ? 'Despesa' : 'Receita'}`);
    if (parsed.installmentCount && parsed.installmentCount > 1) {
      fieldsList.push(`Parcelas: ${parsed.installmentCount}x`);
    }

    // Toast 2: Show parsed fields (with delay so both toasts are visible)
    setTimeout(() => {
      toast({
        title: '📝 Campos identificados',
        description: fieldsList.length > 0 ? fieldsList.join(' | ') : 'Nenhum campo identificado',
      });
    }, 500);

    // Track parsed values for auto-save check
    let parsedAmountCents = 0;
    let parsedDescription = '';
    let parsedCategoryId = '';
    let parsedAccountId = '';

    // Determine type to use:
    // - Prefer explicit type from speech
    // - Otherwise, if category matches only one type, use that type (so the <select> options contain the chosen category)
    // - Otherwise, keep current UI type
    let inferredTypeFromCategory: TransactionType | undefined;
    let inferredCategoryId: string | undefined;

    if (parsed.categoryName) {
      const tryTypes: TransactionType[] = [type, type === 'expense' ? 'income' : 'expense'];
      for (const t of tryTypes) {
        const maybeId = matchCategoryByName(parsed.categoryName, categories, t);
        if (maybeId) {
          inferredTypeFromCategory = t;
          inferredCategoryId = maybeId;
          break;
        }
      }
    }

    const typeToUse: TransactionType = parsed.type ?? inferredTypeFromCategory ?? type;
    if (typeToUse !== type) setType(typeToUse);

    // Apply parsed values
    if (parsed.amount !== undefined) {
      parsedAmountCents = Math.round(parsed.amount * 100);
      setAmountCents(parsedAmountCents);
    }

    if (parsed.description) {
      parsedDescription = parsed.description;
      setDescription(parsedDescription);
    }

    if (parsed.date) {
      setDate(parsed.date);
    }

    if (parsed.installmentCount) {
      setInstallmentCount(parsed.installmentCount);
    }

    if (parsed.autoPay !== undefined) {
      setAutoPay(parsed.autoPay);
    }

    // Category (prefer the inferred ID we already found while inferring type)
    if (inferredCategoryId) {
      parsedCategoryId = inferredCategoryId;
      setCategoryId(inferredCategoryId);
      setCategoryInitialized(true);
    } else if (parsed.categoryName) {
      const matchedCategory = matchCategoryByName(parsed.categoryName, categories, typeToUse);
      if (matchedCategory) {
        parsedCategoryId = matchedCategory;
        setCategoryId(matchedCategory);
        setCategoryInitialized(true);
      }
    }

    // If no category matched, use default
    if (!parsedCategoryId) {
      const defaultCategory = categories.find(
        (c) => c.isSystem && c.name === 'Outros' && c.type === typeToUse,
      );
      if (defaultCategory) {
        parsedCategoryId = defaultCategory.id;
        setCategoryId(defaultCategory.id);
        setCategoryInitialized(true);
      }
    }

    // Account
    if (parsed.accountName) {
      const matchedAccount = matchAccountByName(parsed.accountName, accounts);
      if (matchedAccount) {
        parsedAccountId = matchedAccount;
        setAccountId(matchedAccount);
      }
    }

    // If no account matched, use primary or first
    if (!parsedAccountId) {
      const primaryAccount = accounts.find((acc) => acc.isPrimary);
      parsedAccountId = primaryAccount ? primaryAccount.id : accounts[0]?.id || '';
      if (parsedAccountId) {
        setAccountId(parsedAccountId);
      }
    }

    // Check if all required fields are filled and auto-save is enabled
    const allRequiredFilled =
      parsedAmountCents > 0 && parsedDescription && parsedCategoryId && parsedAccountId;

    if (autoSaveVoiceTransaction && allRequiredFilled && !autoSaveTriggeredRef.current) {
      autoSaveTriggeredRef.current = true;

      // Auto-save the transaction
      const numericAmount = parsedAmountCents / 100;

       const effectiveRecurrence: RecurrenceType =
         parsed.installmentCount && parsed.installmentCount > 1 ? 'installment' : 'once';

       addTransaction({
        accountId: parsedAccountId,
        categoryId: parsedCategoryId,
        description: parsedDescription,
        amount: numericAmount,
        date: parsed.date ? format(parsed.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        type: typeToUse,
        isPaid: false,
         recurrenceType: effectiveRecurrence,
        installmentTotal:
           effectiveRecurrence === 'installment' && parsed.installmentCount
             ? parsed.installmentCount
             : undefined,
         installmentCurrent: effectiveRecurrence === 'installment' ? 1 : undefined,
        autoSettle: parsed.autoPay || false,
        notes: undefined,
        startDate: parsed.date ? format(parsed.date, 'yyyy-MM-dd') : undefined,
      });

      // Play confirmation sound
      playConfirmationSound();

      // Invalidate transactions query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      // Show success toast with visual feedback
      toast({
        title: '✓ Lançamento salvo',
        description: `${parsedDescription} - R$ ${numericAmount.toFixed(2)}`,
      });

      // Navigate to transactions page to show the new transaction
      navigate('/transactions', { state: { newTransaction: true } });
      return;
    }

    toast({
      title: 'Lançamento por voz',
      description: 'Campos preenchidos a partir do áudio. Revise antes de salvar.',
    });
  }, [
    location.state,
    voiceProcessed,
    categories,
    accounts,
    toast,
    autoSaveVoiceTransaction,
    addTransaction,
    navigate,
    queryClient,
    type,
  ]);

  // Set default category "Outros" when categories load (only if voice has NOT been processed)
  useEffect(() => {
    if (voiceProcessedRef.current) return;

    if (categories.length > 0 && !categoryId && !categoryInitialized) {
      const defaultCategory = categories.find(
        (c) => c.isSystem && c.name === 'Outros' && c.type === type,
      );
      if (defaultCategory) {
        setCategoryId(defaultCategory.id);
        setCategoryInitialized(true);
      }
    }
  }, [categories, type, categoryId, categoryInitialized]);

  // Update category when type changes (only if not from voice input)
  useEffect(() => {
    // Skip if voice was just processed - don't override voice-set category
    if (voiceProcessedRef.current) return;

    const defaultCategory = categories.find(
      (c) => c.isSystem && c.name === 'Outros' && c.type === type,
    );
    if (defaultCategory) {
      setCategoryId(defaultCategory.id);
    }
  }, [type, categories]);

  // Set default account when accounts load (prefer primary account)
  useEffect(() => {
    if (voiceProcessedRef.current) return;

    if (accounts.length > 0 && !accountId) {
      const primaryAccount = accounts.find((acc) => acc.isPrimary);
      setAccountId(primaryAccount ? primaryAccount.id : accounts[0].id);
    }
  }, [accounts, accountId]);

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

  const handleSubmit = async () => {
    if (amountCents === 0 || !description || !categoryId || !accountId) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const numericAmount = amountCents / 100;
    const effectiveRecurrence: RecurrenceType = installmentCount > 1 ? 'installment' : 'once';

    try {
      const tagIds = selectedTags.map(t => t.id);
      await addTransaction({
        accountId,
        categoryId,
        description,
        amount: numericAmount,
        date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        type,
        isPaid: false,
        recurrenceType: effectiveRecurrence,
        installmentTotal: effectiveRecurrence === 'installment' ? installmentCount : undefined,
        installmentCurrent: effectiveRecurrence === 'installment' ? 1 : undefined,
        autoSettle: autoPay,
        notes: notes || undefined,
        startDate: date ? format(date, 'yyyy-MM-dd') : undefined,
      }, tagIds.length > 0 ? tagIds : undefined);

      // Play confirmation sound
      playConfirmationSound();

      handleClose();
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a transação.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
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

  const isLoading = isLoadingAccounts || isLoadingCategories;

  if (isLoading) {
    return (
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background">
        <Header title="Novo Lançamento" showBack onBack={handleClose} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background">
      <Header title="Novo Lançamento" showBack onBack={handleClose} />

      <main className="flex-1 flex flex-col p-6 gap-6 pb-32">
        {/* Type Toggle */}
        <div className="grid grid-cols-2 gap-2 bg-card p-1.5 rounded-full shadow-sm border border-border/50">
          <button
            onClick={() => setType('expense')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-full font-bold text-sm transition-all ${
              type === 'expense'
                ? 'bg-destructive/10 text-destructive shadow-sm border border-destructive/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
            Despesa
          </button>
          <button
            onClick={() => setType('income')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-full font-bold text-sm transition-all ${
              type === 'income'
                ? 'bg-success/10 text-success shadow-sm border border-success/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
            Receita
          </button>
        </div>

        {/* Amount Input */}
        <div className="flex flex-col items-center justify-center py-4">
          <p className="text-muted-foreground text-sm font-medium mb-1">Valor do lançamento</p>
          <div className="flex items-center justify-center w-full">
            <span className={`text-3xl font-bold mr-1 self-center pb-1 ${type === 'expense' ? 'text-destructive' : 'text-success'}`}>R$</span>
            <input
              type="text"
              inputMode="decimal"
              value={formatAmountDisplay(amountCents)}
              onChange={handleAmountChange}
              className={`w-full max-w-[280px] bg-transparent border-none p-0 text-5xl font-bold text-center focus:ring-0 focus:outline-none leading-tight cursor-text ${type === 'expense' ? 'text-destructive' : 'text-success'}`}
            />
          </div>
        </div>

        {/* Form Fields */}
        <div className="flex flex-col gap-5 bg-card p-6 rounded-3xl shadow-sm border border-border/50">
          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
              Descrição
            </label>
            <div className="input-gold p-4">
              <div className="flex items-center gap-3">
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
          </div>

          {/* Category + Account (left) and Date (right) on md+ */}
          <div className="flex flex-col md:flex-row md:gap-4">
            {/* Category and Account - stacked on left */}
            <div className="flex flex-col gap-4 md:flex-1">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                  Categoria
                </label>
                <div className="input-gold p-4">
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-foreground text-base font-medium appearance-none cursor-pointer"
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
                <div className="input-gold p-4">
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-foreground text-base font-medium appearance-none cursor-pointer"
                  >
                    <option value="">Selecione</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Date - right on md+, below on mobile */}
            <div className="space-y-2 mt-4 md:mt-0 md:flex-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                Data
              </label>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={ptBR}
                  className="rounded-xl border border-border/50 bg-card p-3"
                />
              </div>
            </div>
          </div>

          {/* Número de Parcelas (sempre visível; 1x = lançamento único) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
              Número de Parcelas
            </label>
            <div className="grid grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setInstallmentCount(num)}
                  className={`py-3 px-2 rounded-xl font-semibold text-sm transition-all ${
                    installmentCount === num
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'bg-secondary text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {num}x
                </button>
              ))}
            </div>
          </div>

          {/* Auto Pay + Notes side by side on md+ */}
          <div className="flex flex-col md:flex-row md:gap-4 md:items-stretch">
            {/* Auto Pay Toggle - left on md+ */}
            <div className="flex flex-col gap-3 bg-secondary p-4 rounded-2xl md:flex-1">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAutoPay(!autoPay)}
                  className={`p-2 rounded-full transition-colors ${autoPay ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'}`}
                  title={autoPay ? 'Desativar Baixa Automática' : 'Ativar Baixa Automática'}
                >
                  <CalendarCheck className="w-5 h-5" />
                </button>
                <span className="text-base font-semibold text-foreground">Baixa Automática</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Quando ativada, este lançamento será marcado como <span className="font-semibold">Pago/Recebido</span> automaticamente no dia seguinte à sua data prevista.
              </p>
            </div>

            {/* Notes - right on md+, below on mobile */}
            <div className="space-y-2 mt-4 md:mt-0 md:flex-1">
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
              <div className="input-gold p-4 h-full">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione observações sobre este lançamento..."
                  rows={3}
                  className="w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-foreground placeholder-muted-foreground text-sm font-medium resize-none"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <TagSelector
            selectedTags={selectedTags}
            availableTags={availableTags}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            onCreateTag={handleCreateTag}
          />
        </div>
      </main>

      {/* Submit Button */}
      <div className="p-6 bg-background pt-0 fixed bottom-0 left-0 w-full z-20">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full btn-gold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <span className="material-symbols-outlined icon-filled">check_circle</span>
          )}
          {isSubmitting ? 'Salvando...' : 'Salvar Lançamento'}
        </button>
      </div>
    </div>
  );
}
