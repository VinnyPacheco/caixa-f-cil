import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Category } from '@/types/finance';
import { 
  fetchCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from '@/services/categoriesService';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { useToast } from '@/hooks/use-toast';

export function useCategories() {
  const { user } = useAuth();
  const { isSimulation } = useSimulation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (category: Omit<Category, 'id'>) => {
      if (!user) throw new Error('User not authenticated');
      if (isSimulation) {
        const fake: Category = { ...category, id: crypto.randomUUID() };
        queryClient.setQueryData(['categories'], (old: Category[] | undefined) => [...(old || []), fake]);
        return fake;
      }
      return createCategory(category, user.id);
    },
    onSuccess: (newCategory) => {
      if (!isSimulation) queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Categoria criada', description: `A categoria "${newCategory.name}" foi criada com sucesso.` });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar categoria', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Category, 'id'>> }) => {
      if (isSimulation) {
        const updated = { id, ...data } as Category;
        queryClient.setQueryData(['categories'], (old: Category[] | undefined) =>
          (old || []).map(c => c.id === id ? { ...c, ...data } : c)
        );
        return updated;
      }
      return updateCategory(id, data);
    },
    onSuccess: (updatedCategory) => {
      if (!isSimulation) queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Categoria atualizada', description: `A categoria "${updatedCategory.name}" foi atualizada com sucesso.` });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar categoria', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isSimulation) {
        queryClient.setQueryData(['categories'], (old: Category[] | undefined) =>
          (old || []).filter(c => c.id !== id)
        );
        return;
      }
      return deleteCategory(id);
    },
    onSuccess: () => {
      if (!isSimulation) queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Categoria excluída', description: 'A categoria foi excluída com sucesso.' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao excluir categoria', description: error.message, variant: 'destructive' });
    },
  });

  return {
    categories: categoriesQuery.data || [],
    isLoading: categoriesQuery.isLoading,
    isError: categoriesQuery.isError,
    error: categoriesQuery.error,
    createCategory: createMutation.mutate,
    updateCategory: updateMutation.mutate,
    deleteCategory: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
