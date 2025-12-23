import { useState, useEffect } from 'react';
import { Account, AccountType } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
  onSave: (account: Omit<Account, 'id'> & { id?: string }) => void;
}

const accountTypes: { value: AccountType; label: string }[] = [
  { value: 'checking', label: 'Conta Corrente' },
  { value: 'savings', label: 'Poupança' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'cash', label: 'Dinheiro' },
];

const accountIcons = [
  'account_balance',
  'credit_card',
  'wallet',
  'savings',
  'payments',
  'currency_exchange',
  'attach_money',
  'account_balance_wallet',
];

const accountColors = [
  '#820AD1', // Nubank purple
  '#EC7000', // Itaú orange
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#64748B', // Gray
];

export function AccountForm({ open, onOpenChange, account, onSave }: AccountFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [initialBalance, setInitialBalance] = useState('');
  const [color, setColor] = useState(accountColors[0]);
  const [icon, setIcon] = useState(accountIcons[0]);
  const [isPrimary, setIsPrimary] = useState(false);

  const isEditing = !!account;

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setInitialBalance(account.initialBalance.toString());
      setColor(account.color);
      setIcon(account.icon);
      setIsPrimary(account.isPrimary ?? false);
    } else {
      setName('');
      setType('checking');
      setInitialBalance('');
      setColor(accountColors[0]);
      setIcon(accountIcons[0]);
      setIsPrimary(false);
    }
  }, [account, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave({
      ...(account?.id && { id: account.id }),
      name: name.trim(),
      type,
      initialBalance: parseFloat(initialBalance) || 0,
      color,
      icon,
      isPrimary,
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da conta</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Nubank, Itaú..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de conta</Label>
            <Select value={type} onValueChange={(value) => setType(value as AccountType)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border z-50">
                {accountTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance">Saldo inicial</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {accountColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`size-8 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-accent scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-2">
              {accountIcons.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`size-10 rounded-xl flex items-center justify-center transition-all ${
                    icon === i
                      ? 'ring-2 ring-accent bg-accent/20'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ color: color }}>
                    {i}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Primary Account Toggle */}
          <div className="flex items-center justify-between bg-secondary p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-card text-accent">
                <span className="material-symbols-outlined text-[20px]">star</span>
              </div>
              <div>
                <span className="text-base font-semibold text-foreground">Conta Principal</span>
                <p className="text-xs text-muted-foreground">Selecionada por padrão nos lançamentos</p>
              </div>
            </div>
            <Switch
              checked={isPrimary}
              onCheckedChange={setIsPrimary}
            />
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-gold">
              {isEditing ? 'Salvar' : 'Criar Conta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
