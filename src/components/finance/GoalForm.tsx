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
import { Checkbox } from '@/components/ui/checkbox';
import { format, startOfMonth } from 'date-fns';

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
  const [createMonthlyPlaceholder, setCreateMonthlyPlaceholder] = useState(false);

  useEffect(() => {
    if (open) {
      if (goal) {
        setName(goal.name);
        setGoalType(goal.goalType);
        setCategoryId(goal.categoryId || '');
        setAccountId(goal.accountId || '');
        setAmountInput(formatAmountDisplay(goal.targetAmount));
        setCreateMonthlyPlaceholder(!!goal.createMonthlyPlaceholder);
      } else {
        setName('');
        setGoalType('category');
        setCategoryId('');
        setAccountId('');
        setAmountInput('');
        setCreateMonthlyPlaceholder(false);
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
    const selectedCategory =
      goalType === 'category' ? categories.find((c) => c.id === categoryId) : undefined;
    const isExpenseCategory = selectedCategory?.type === 'expense';
    const payload: Omit<Goal, 'id'> = {
      name: name.trim(),
      goalType,
      categoryId: goalType === 'category' ? categoryId : null,
      accountId: goalType === 'account' ? accountId : null,
      targetAmount,
      createMonthlyPlaceholder: isExpenseCategory ? createMonthlyPlaceholder : false,
      startMonth:
        isExpenseCategory && createMonthlyPlaceholder && !goal?.startMonth
          ? format(startOfMonth(new Date()), 'yyyy-MM-dd')
          : goal?.startMonth ?? null,
    };
    if (goal) onUpdate(goal.id, payload);
    else onSave(payload);
    onOpenChange(false);
  };

  const selectedCategory =
    goalType === 'category' ? categories.find((c) => c.id === categoryId) : undefined;
  const showPlaceholderOption = goalType === 'category' && selectedCategory?.type === 'expense';

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

          {showPlaceholderOption && (
            <label className="flex items-start gap-2 rounded-xl border border-border p-3 cursor-pointer hover:border-accent/40 transition-colors">
              <Checkbox
                checked={createMonthlyPlaceholder}
                onCheckedChange={(v) => setCreateMonthlyPlaceholder(!!v)}
                className="mt-0.5"
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-foreground">
                  Criar Lançamento Mensal automático
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Um lançamento virtual será exibido no último dia de cada mês com o valor
                  restante da meta (meta − soma dos lançamentos da categoria). Nunca fica
                  abaixo de zero.
                </span>
              </div>
            </label>
          )}
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