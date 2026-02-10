import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Account } from '@/types/finance';
import { 
  fetchAccounts, 
  createAccount, 
  updateAccount, 
  deleteAccount 
} from '@/services/accountsService';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { useToast } from '@/hooks/use-toast';

export function useAccounts() {
  const { user } = useAuth();
  const { isSimulation } = useSimulation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (account: Omit<Account, 'id'>) => {
      if (!user) throw new Error('User not authenticated');
      if (isSimulation) {
        const fake: Account = { ...account, id: crypto.randomUUID() };
        queryClient.setQueryData(['accounts'], (old: Account[] | undefined) => [...(old || []), fake]);
        return fake;
      }
      return createAccount(account, user.id);
    },
    onSuccess: (newAccount) => {
      if (!isSimulation) queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Conta criada', description: `A conta "${newAccount.name}" foi criada com sucesso.` });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar conta', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Account, 'id'>> }) => {
      if (isSimulation) {
        const updated = { id, ...data } as Account;
        queryClient.setQueryData(['accounts'], (old: Account[] | undefined) =>
          (old || []).map(a => a.id === id ? { ...a, ...data } : a)
        );
        return updated;
      }
      return updateAccount(id, data);
    },
    onSuccess: (updatedAccount) => {
      if (!isSimulation) queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Conta atualizada', description: `A conta "${updatedAccount.name}" foi atualizada com sucesso.` });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar conta', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isSimulation) {
        queryClient.setQueryData(['accounts'], (old: Account[] | undefined) =>
          (old || []).filter(a => a.id !== id)
        );
        return;
      }
      return deleteAccount(id);
    },
    onSuccess: () => {
      if (!isSimulation) queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Conta excluída', description: 'A conta foi excluída com sucesso.' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao excluir conta', description: error.message, variant: 'destructive' });
    },
  });

  return {
    accounts: accountsQuery.data || [],
    isLoading: accountsQuery.isLoading,
    isError: accountsQuery.isError,
    error: accountsQuery.error,
    createAccount: createMutation.mutate,
    updateAccount: updateMutation.mutate,
    deleteAccount: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
