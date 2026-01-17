import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Tag } from '@/types/tag';
import {
  fetchTags,
  createTag,
  findOrCreateTag,
  fetchTransactionTags,
  fetchTagsForTransactions,
  setTransactionTags,
  addTagsToTransaction,
} from '@/services/tagsService';

export function useTags() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags,
    enabled: !!user,
  });

  const createTagMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!user) throw new Error('User not authenticated');
      return createTag(name, color, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const findOrCreateTagMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!user) throw new Error('User not authenticated');
      return findOrCreateTag(name, color, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  return {
    tags: tagsQuery.data || [],
    isLoading: tagsQuery.isLoading,
    error: tagsQuery.error,
    createTag: createTagMutation.mutateAsync,
    findOrCreateTag: findOrCreateTagMutation.mutateAsync,
  };
}

export function useTransactionTags(transactionId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const tagsQuery = useQuery({
    queryKey: ['transaction-tags', transactionId],
    queryFn: () => fetchTransactionTags(transactionId!),
    enabled: !!user && !!transactionId,
  });

  const setTagsMutation = useMutation({
    mutationFn: async (tagIds: string[]) => {
      if (!user || !transactionId) throw new Error('Missing user or transaction');
      return setTransactionTags(transactionId, tagIds, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-tags', transactionId] });
    },
  });

  return {
    tags: tagsQuery.data || [],
    isLoading: tagsQuery.isLoading,
    setTags: setTagsMutation.mutateAsync,
  };
}

export function useTransactionTagsBulk(transactionIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['transaction-tags-bulk', transactionIds.sort().join(',')],
    queryFn: () => fetchTagsForTransactions(transactionIds),
    enabled: !!user && transactionIds.length > 0,
    staleTime: 30000, // 30 seconds
  });
}

export function useAddTagsToTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionId, tagIds }: { transactionId: string; tagIds: string[] }) => {
      if (!user) throw new Error('User not authenticated');
      return addTagsToTransaction(transactionId, tagIds, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-tags'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-tags-bulk'] });
    },
  });
}
