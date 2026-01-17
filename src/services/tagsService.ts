import { supabase } from '@/integrations/supabase/client';
import { Tag } from '@/types/tag';

interface DbTag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

interface DbTransactionTag {
  id: string;
  transaction_id: string;
  tag_id: string;
  user_id: string;
  created_at: string;
}

// Convert database tag to frontend tag
function dbToTag(dbTag: DbTag): Tag {
  return {
    id: dbTag.id,
    name: dbTag.name,
    color: dbTag.color,
  };
}

// Fetch all tags for the current user
export async function fetchTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map(dbToTag);
}

// Create a new tag
export async function createTag(name: string, color: string, userId: string): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .insert([{ name, color, user_id: userId }])
    .select()
    .single();

  if (error) throw error;
  return dbToTag(data);
}

// Find or create a tag by name (case-insensitive)
export async function findOrCreateTag(name: string, color: string, userId: string): Promise<Tag> {
  // First try to find existing tag
  const { data: existing } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', name)
    .maybeSingle();

  if (existing) {
    return dbToTag(existing);
  }

  // Create new tag
  return createTag(name, color, userId);
}

// Fetch tags for a specific transaction
export async function fetchTransactionTags(transactionId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('transaction_tags')
    .select('tag_id, tags(*)')
    .eq('transaction_id', transactionId);

  if (error) throw error;
  
  return (data || [])
    .filter((item: any) => item.tags)
    .map((item: any) => dbToTag(item.tags));
}

// Fetch tags for multiple transactions at once
export async function fetchTagsForTransactions(transactionIds: string[]): Promise<Record<string, Tag[]>> {
  if (transactionIds.length === 0) return {};

  const { data, error } = await supabase
    .from('transaction_tags')
    .select('transaction_id, tag_id, tags(*)')
    .in('transaction_id', transactionIds);

  if (error) throw error;

  const result: Record<string, Tag[]> = {};
  
  for (const item of (data || []) as any[]) {
    if (!item.tags) continue;
    
    const transactionId = item.transaction_id;
    if (!result[transactionId]) {
      result[transactionId] = [];
    }
    result[transactionId].push(dbToTag(item.tags));
  }

  return result;
}

// Set tags for a transaction (replaces existing tags)
export async function setTransactionTags(
  transactionId: string,
  tagIds: string[],
  userId: string
): Promise<void> {
  // Delete existing tags for this transaction
  await supabase
    .from('transaction_tags')
    .delete()
    .eq('transaction_id', transactionId);

  // Insert new tags
  if (tagIds.length > 0) {
    const { error } = await supabase
      .from('transaction_tags')
      .insert(
        tagIds.map((tagId) => ({
          transaction_id: transactionId,
          tag_id: tagId,
          user_id: userId,
        }))
      );

    if (error) throw error;
  }
}

// Add tags to a newly created transaction
export async function addTagsToTransaction(
  transactionId: string,
  tagIds: string[],
  userId: string
): Promise<void> {
  if (tagIds.length === 0) return;

  const { error } = await supabase
    .from('transaction_tags')
    .insert(
      tagIds.map((tagId) => ({
        transaction_id: transactionId,
        tag_id: tagId,
        user_id: userId,
      }))
    );

  if (error) throw error;
}
