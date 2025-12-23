import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Account } from '@/types/finance';
import { 
  fetchAccounts, 
  createAccount, 
  updateAccount, 
  deleteAccount 
} from '@/services/accountsService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useAccounts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (account: Omit<Account, 'id'>) => {
      if (!user) throw new Error('User not authenticated');
      return createAccount(account, user.id);
    },
    onSuccess: (newAccount) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: 'Conta criada',
        description: `A conta "${newAccount.name}" foi criada com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar conta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Account, 'id'>> }) => 
      updateAccount(id, data),
    onSuccess: (updatedAccount) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: 'Conta atualizada',
        description: `A conta "${updatedAccount.name}" foi atualizada com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar conta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: 'Conta excluída',
        description: 'A conta foi excluída com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir conta',
        description: error.message,
        variant: 'destructive',
      });
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
