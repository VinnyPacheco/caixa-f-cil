import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Plus, Target } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { GoalProgressCard } from '@/components/finance/GoalProgressCard';
import { GoalForm } from '@/components/finance/GoalForm';
import { Goal } from '@/types/goal';

export default function Goals() {
  const { displayName } = useProfile();
  const { progress, categories, accounts, createGoal, updateGoal, deleteGoal, isLoading } =
    useGoals(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const categoryGoals = progress.filter((p) => p.goal.goalType === 'category');
  const accountGoals = progress.filter((p) => p.goal.goalType === 'account');

  return (
    <AppLayout>
      <Header showAvatar showNotification userName={displayName} />

      <main className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Target className="h-6 w-6 text-accent" />
              Metas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Defina objetivos por categoria (mensal) ou por conta (acumulado).
            </p>
          </div>
          <Button onClick={handleNew} size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> Nova
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
        ) : progress.length === 0 ? (
          <button
            onClick={handleNew}
            className="flex flex-col items-center justify-center gap-2 border border-dashed border-border/60 rounded-2xl py-12 text-sm text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors"
          >
            <Target className="h-8 w-8" />
            Crie sua primeira meta
          </button>
        ) : (
          <>
            {categoryGoals.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                  Por categoria — este mês
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categoryGoals.map((p) => (
                    <GoalProgressCard
                      key={p.goal.id}
                      progress={p}
                      onClick={() => {
                        setEditing(p.goal);
                        setFormOpen(true);
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {accountGoals.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                  Por conta — acumulado
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {accountGoals.map((p) => (
                    <GoalProgressCard
                      key={p.goal.id}
                      progress={p}
                      onClick={() => {
                        setEditing(p.goal);
                        setFormOpen(true);
                      }}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <GoalForm
        open={formOpen}
        onOpenChange={setFormOpen}
        goal={editing}
        categories={categories}
        accounts={accounts}
        onSave={(g) => createGoal(g)}
        onUpdate={(id, data) => updateGoal({ id, data })}
        onDelete={(id) => deleteGoal(id)}
      />
    </AppLayout>
  );
}