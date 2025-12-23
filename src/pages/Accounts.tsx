import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { useAccounts } from '@/hooks/useAccounts';
import { Account, AccountType } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { AccountForm } from '@/components/finance/AccountForm';
import { Plus } from 'lucide-react';

const accountTypeLabels: Record<AccountType, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  credit_card: 'Cartão de Crédito',
  cash: 'Dinheiro',
};

const accountTypeIcons: Record<AccountType, string> = {
  checking: 'account_balance',
  savings: 'savings',
  credit_card: 'credit_card',
  cash: 'wallet',
};

export default function Accounts() {
  const { accounts, createAccount, updateAccount, isLoading } = useAccounts();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleSaveAccount = (accountData: Omit<Account, 'id'> & { id?: string }) => {
    if (accountData.id) {
      updateAccount({ id: accountData.id, data: accountData });
    } else {
      createAccount(accountData);
    }
    setEditingAccount(null);
    setFormOpen(false);
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setFormOpen(true);
  };

  const handleNewAccount = () => {
    setEditingAccount(null);
    setFormOpen(true);
  };

  return (
    <AppLayout>
      <Header title="Contas" showBack />

      <main className="flex flex-col gap-6 p-6">
        {/* Account List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
              Suas Contas
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-accent hover:text-accent/80"
              onClick={handleNewAccount}
            >
              <Plus className="size-4 mr-1" />
              Nova Conta
            </Button>
          </div>

          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/50">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => handleEditAccount(account)}
                className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
              >
                <div
                  className="size-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${account.color}20` }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: account.color }}
                  >
                    {account.icon || accountTypeIcons[account.type]}
                  </span>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground">{account.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {accountTypeLabels[account.type]}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">
                    {formatCurrency(account.initialBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground">Saldo inicial</p>
                </div>
                <span className="material-symbols-outlined text-muted-foreground">
                  chevron_right
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total em contas</p>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(
                  accounts.reduce((sum, acc) => sum + acc.initialBalance, 0)
                )}
              </p>
            </div>
            <div className="size-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-accent">
                account_balance_wallet
              </span>
            </div>
          </div>
        </div>
      </main>

      <AccountForm
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editingAccount}
        onSave={handleSaveAccount}
      />
    </AppLayout>
  );
}
