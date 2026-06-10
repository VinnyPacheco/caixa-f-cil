import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfDay } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { fetchGoals, createGoal, updateGoal, deleteGoal } from '@/services/goalsService';
import { fetchTransactions } from '@/services/transactionsService';
import { fetchCategories } from '@/services/categoriesService';
import { fetchAccounts } from '@/services/accountsService';
import { Goal, GoalProgress } from '@/types/goal';

export function useGoals(referenceDate: Date = new Date()) {
  const { user } = useAuth();
  const { isSimulation } = useSimulation();
  const queryClient = useQueryClient();

  const opts = { enabled: !!user, staleTime: isSimulation ? Infinity : 0 };

  const goalsQuery = useQuery({ queryKey: ['goals'], queryFn: fetchGoals, ...opts });
  const txQuery = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions, ...opts });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: fetchCategories, ...opts });
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: fetchAccounts, ...opts });

  const goals = goalsQuery.data || [];
  const transactions = txQuery.data || [];
  const categories = categoriesQuery.data || [];
  const accounts = accountsQuery.data || [];

  const progress: GoalProgress[] = useMemo(() => {
    const monthStart = startOfMonth(referenceDate);
    const monthEnd = endOfMonth(referenceDate);
    const today = startOfDay(new Date());

    return goals.map<GoalProgress>((goal) => {
      if (goal.goalType === 'category') {
        const category = categories.find((c) => c.id === goal.categoryId);
        const monthTx = transactions.filter(
          (t) =>
            t.categoryId === goal.categoryId &&
            isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })
        );
        const current = monthTx.reduce((sum, t) => sum + t.amount, 0);
        const target = goal.targetAmount;
        const percent = target > 0 ? (current / target) * 100 : 0;
        let status: GoalProgress['status'];
        if (category?.type === 'expense') {
          // expense: target is a cap, lower = better
          if (current > target) status = 'over';
          else if (current >= target * 0.9) status = 'behind';
          else status = 'on-track';
        } else {
          if (current >= target) status = 'reached';
          else if (current >= target * 0.6) status = 'on-track';
          else status = 'behind';
        }
        return {
          goal,
          category,
          current,
          target,
          percent,
          status,
          scopeLabel: 'Este mês',
        };
      }
      // account goal: cumulative balance
      const account = accounts.find((a) => a.id === goal.accountId);
      const accountTx = transactions.filter(
        (t) => t.accountId === goal.accountId && t.isPaid && parseISO(t.date) <= today
      );
      const delta = accountTx.reduce(
        (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
        0
      );
      const current = (account?.initialBalance || 0) + delta;
      const target = goal.targetAmount;
      const percent = target > 0 ? (current / target) * 100 : 0;
      let status: GoalProgress['status'];
      if (current >= target) status = 'reached';
      else if (percent >= 60) status = 'on-track';
      else status = 'behind';
      return {
        goal,
        account,
        current,
        target,
        percent,
        status,
        scopeLabel: 'Acumulado',
      };
    });
  }, [goals, transactions, categories, accounts, referenceDate]);

  const createMutation = useMutation({
    mutationFn: (goal: Omit<Goal, 'id'>) => createGoal(goal, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Goal, 'id'>> }) =>
      updateGoal(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });

  return {
    goals,
    progress,
    categories,
    accounts,
    isLoading: goalsQuery.isLoading,
    createGoal: createMutation.mutate,
    updateGoal: updateMutation.mutate,
    deleteGoal: deleteMutation.mutate,
  };
}