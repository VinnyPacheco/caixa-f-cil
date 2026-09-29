import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TransactionType } from '@/types/finance';

export type QuickAddPosition = 'before' | 'after';

export interface QuickAddData {
  amount: number;
  description: string;
  type: TransactionType;
}

/** Thin hover zone between cards that reveals a green "+" line. */
export function QuickAddInsertLine({ onClick }: { onClick: () => void }) {
  return (
    <div className="relative h-1.5 group/qa">
      <button
        type="button"
        onClick={onClick}
        aria-label="Inserir lançamento aqui"
        className="absolute inset-x-0 -top-1 -bottom-1 z-10 flex items-center opacity-0 group-hover/qa:opacity-100 focus-visible:opacity-100 transition-opacity"
      >
        <span className="flex-1 h-0.5 rounded-full bg-success" />
        <span className="mx-1 flex h-5 w-5 items-center justify-center rounded-full bg-success text-success-foreground shadow-sm">
          <Plus className="h-3.5 w-3.5" />
        </span>
        <span className="flex-1 h-0.5 rounded-full bg-success" />
      </button>
    </div>
  );
}

interface QuickAddCardProps {
  onSave: (data: QuickAddData) => Promise<void>;
  onCancel: () => void;
}

export function QuickAddCard({ onSave, onCancel }: QuickAddCardProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [cents, setCents] = useState(0);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  const display = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const canSave = cents > 0 && description.trim().length > 0 && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ amount: cents / 100, description: description.trim(), type });
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  };

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border-2 border-success/60 bg-card p-2 shadow-sm"
      onKeyDown={onKeyDown}
    >
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 rounded-full bg-muted p-0.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={cn('rounded-full px-2 py-0.5 transition-colors', type === 'expense' ? 'bg-destructive/15 text-destructive' : 'text-muted-foreground')}
          >
            Saída
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={cn('rounded-full px-2 py-0.5 transition-colors', type === 'income' ? 'bg-success/15 text-success' : 'text-muted-foreground')}
          >
            Entrada
          </button>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 text-sm font-bold">
          <span className="text-muted-foreground">R$</span>
          <input
            ref={amountRef}
            inputMode="numeric"
            value={display}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
              setCents(Number(digits || '0'));
            }}
            className="w-24 min-w-0 bg-transparent text-right outline-none"
            aria-label="Valor"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição"
          className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          aria-label="Descrição"
        />
        <button
          type="button"
          onClick={onCancel}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground hover:text-foreground"
          aria-label="Cancelar"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSave}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-success text-success-foreground disabled:opacity-40"
          aria-label="Salvar"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
