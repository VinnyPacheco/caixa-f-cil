import { useNavigate } from 'react-router-dom';
import { Target, Plus } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { GoalProgressCard } from './GoalProgressCard';

interface Props {
  referenceDate?: Date;
  /** Maximum goals to show (rest accessible via "Ver tudo") */
  limit?: number;
  /** Render compact list (no header) when used inside a side panel */
  variant?: 'page' | 'panel';
}

export function GoalsWidget({ referenceDate, limit, variant = 'page' }: Props) {
  const navigate = useNavigate();
  const { progress, isLoading } = useGoals(referenceDate);

  const visible = limit ? progress.slice(0, limit) : progress;

  if (variant === 'panel') {
    if (isLoading) {
      return <p className="text-xs text-muted-foreground text-center py-6">Carregando...</p>;
    }
    if (progress.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <Target className="h-7 w-7 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">Nenhuma meta ainda</p>
          <button
            onClick={() => navigate('/metas')}
            className="text-xs font-bold text-accent hover:underline"
          >
            Criar meta
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        {visible.map((p) => (
          <GoalProgressCard
            key={p.goal.id}
            progress={p}
            compact
            onClick={() => navigate('/metas')}
          />
        ))}
        {limit && progress.length > limit && (
          <button
            onClick={() => navigate('/metas')}
            className="text-[11px] font-bold text-accent hover:underline self-end mt-1"
          >
            Ver todas ({progress.length})
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-accent" />
          <h3 className="text-foreground text-lg font-bold leading-tight tracking-tight">Metas</h3>
        </div>
        <button
          onClick={() => navigate('/metas')}
          className="text-sm font-bold text-accent hover:opacity-80"
        >
          {progress.length === 0 ? 'Criar' : 'Ver tudo'}
        </button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>
      ) : progress.length === 0 ? (
        <button
          onClick={() => navigate('/metas')}
          className="flex items-center justify-center gap-2 border border-dashed border-border/60 rounded-xl py-6 text-sm text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Defina sua primeira meta
        </button>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {visible.map((p) => (
            <GoalProgressCard
              key={p.goal.id}
              progress={p}
              compact
              onClick={() => navigate('/metas')}
            />
          ))}
        </div>
      )}
    </section>
  );
}