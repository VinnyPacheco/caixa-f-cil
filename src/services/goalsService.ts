import { supabase } from '@/integrations/supabase/client';
import { Goal } from '@/types/goal';

interface DbGoal {
  id: string;
  user_id: string;
  name: string;
  goal_type: string;
  category_id: string | null;
  account_id: string | null;
  target_amount: number;
  start_month: string | null;
  notes: string | null;
  create_monthly_placeholder?: boolean | null;
}

function dbToGoal(g: DbGoal): Goal {
  return {
    id: g.id,
    name: g.name,
    goalType: g.goal_type as Goal['goalType'],
    categoryId: g.category_id,
    accountId: g.account_id,
    targetAmount: Number(g.target_amount),
    startMonth: g.start_month,
    notes: g.notes,
    createMonthlyPlaceholder: !!g.create_monthly_placeholder,
  };
}

export async function fetchGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => dbToGoal(row as unknown as DbGoal));
}

export async function createGoal(
  goal: Omit<Goal, 'id'>,
  userId: string
): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .insert([
      {
        user_id: userId,
        name: goal.name,
        goal_type: goal.goalType,
        category_id: goal.categoryId ?? null,
        account_id: goal.accountId ?? null,
        target_amount: goal.targetAmount,
        start_month: goal.startMonth ?? null,
        notes: goal.notes ?? null,
        create_monthly_placeholder: goal.createMonthlyPlaceholder ?? false,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return dbToGoal(data as unknown as DbGoal);
}

export async function updateGoal(
  id: string,
  goal: Partial<Omit<Goal, 'id'>>
): Promise<Goal> {
  const updates: Record<string, unknown> = {};
  if (goal.name !== undefined) updates.name = goal.name;
  if (goal.goalType !== undefined) updates.goal_type = goal.goalType;
  if (goal.categoryId !== undefined) updates.category_id = goal.categoryId;
  if (goal.accountId !== undefined) updates.account_id = goal.accountId;
  if (goal.targetAmount !== undefined) updates.target_amount = goal.targetAmount;
  if (goal.startMonth !== undefined) updates.start_month = goal.startMonth;
  if (goal.notes !== undefined) updates.notes = goal.notes;
  if (goal.createMonthlyPlaceholder !== undefined)
    updates.create_monthly_placeholder = goal.createMonthlyPlaceholder;

  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return dbToGoal(data as unknown as DbGoal);
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw error;
}