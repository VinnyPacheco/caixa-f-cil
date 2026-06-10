import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Goal } from '@/types/goal';
import { Account, Category } from '@/types/finance';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
  categories: Category[];
  accounts: Account[];
  onSave: (goal: Omit<Goal, 'id'>) => void;
  onUpdate: (id: string, goal: Partial<Omit<Goal, 'id'>>) => void;
  onDelete?: (id: string) => void;
}

function parseAmountInput(raw: string): number {
  // Decimal-first: digits only -> cents
  const digits = raw.replace(/\D/g, '');
  if (!digits) return 0;
  return Number(digits) / 100;
}

function formatAmountDisplay(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function GoalForm({
  open,
  onOpenChange,
  goal,
  categories,
  accounts,
  onSave,
  onUpdate,
  onDelete,
}: Props) {
  const [name, setName] = useState('');
  const [goalType, setGoalType] = useState<'category' | 'account'>('category');
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [amountInput, setAmountInput] = useState('');

  useEffect(() => {
    if (open) {
      if (goal) {
        setName(goal.name);
        setGoalType(goal.goalType);
        setCategoryId(goal.categoryId || '');
        setAccountId(goal.accountId || '');
        setAmountInput(formatAmountDisplay(goal.targetAmount));
      } else {
        setName('');
        setGoalType('category');
        setCategoryId('');
        setAccountId('');
        setAmountInput('');
      }
    }
  }, [open, goal]);

  const targetAmount = parseAmountInput(amountInput);
  const canSave =
    name.trim().length > 0 &&
    targetAmount > 0 &&
    ((goalType === 'category' && !!categoryId) || (goalType === 'account' && !!accountId));

  const handleSave = () => {
    if (!canSave) return;
    const payload: Omit<Goal, 'id'> = {
      name: name.trim(),
      goalType,
      categoryId: goalType === 'category' ? categoryId : null,
      accountId: goalType === 'account' ? accountId : null,
      targetAmount,
    };
    if (goal) onUpdate(goal.id, payload);
    else onSave(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? 'Editar meta' : 'Nova meta'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGoalType('category')}
              className={cn(
                'rounded-xl border py-3 px-3 text-sm font-bold transition-colors',
                goalType === 'category'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted-foreground hover:border-accent/40'
              )}
            >
              Por categoria
              <p className="text-[10px] font-medium opacity-70 mt-0.5">Mensal</p>
            </button>
            <button
              type="button"
              onClick={() => setGoalType('account')}
              className={cn(
                'rounded-xl border py-3 px-3 text-sm font-bold transition-colors',
                goalType === 'account'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted-foreground hover:border-accent/40'
              )}
            >
              Por conta
              <p className="text-[10px] font-medium opacity-70 mt-0.5">Acumulada</p>
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-name">Nome</Label>
            <Input
              id="goal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={goalType === 'category' ? 'Ex: Limitar mercado' : 'Ex: Reserva de emergência'}
            />
          </div>

          {goalType === 'category' ? (
            <div className="flex flex-col gap-1.5">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.type === 'expense' ? 'Despesa' : 'Receita'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Para despesas o valor é o limite; para receitas, o objetivo a alcançar no mês.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label>Conta</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Saldo acumulado até atingir o valor da meta.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-amount">Valor da meta</Label>
            <Input
              id="goal-amount"
              inputMode="numeric"
              value={amountInput}
              onChange={(e) => {
                const parsed = parseAmountInput(e.target.value);
                setAmountInput(parsed > 0 ? formatAmountDisplay(parsed) : '');
              }}
              placeholder="0,00"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {goal && onDelete && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive mr-auto"
              onClick={() => {
                onDelete(goal.id);
                onOpenChange(false);
              }}
            >
              Excluir
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}