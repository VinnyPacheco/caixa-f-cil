export type FilterType = 'all' | 'pending' | 'paid' | 'income' | 'expense' | 'scheduled';

interface FilterPillsProps {
  activeFilter: FilterType;
  onChange: (filter: FilterType) => void;
}

const filters: { value: FilterType; label: string; active: string; inactive: string }[] = [
  {
    value: 'all',
    label: 'Todos',
    active: 'bg-accent text-accent-foreground border-transparent',
    inactive: 'hover:border-accent hover:text-accent',
  },
  {
    value: 'pending',
    label: 'Pendentes',
    active: 'bg-tangerine text-tangerine-foreground border-transparent',
    inactive: 'hover:border-tangerine hover:text-tangerine',
  },
  {
    value: 'paid',
    label: 'Baixados',
    active: 'bg-mint text-mint-foreground border-transparent',
    inactive: 'hover:border-mint hover:text-mint',
  },
  {
    value: 'income',
    label: 'Entradas',
    active: 'bg-success text-success-foreground border-transparent',
    inactive: 'hover:border-success hover:text-success',
  },
  {
    value: 'expense',
    label: 'Saídas',
    active: 'bg-rose text-rose-foreground border-transparent',
    inactive: 'hover:border-rose hover:text-rose',
  },
  {
    value: 'scheduled',
    label: 'Agendados',
    active: 'bg-info text-info-foreground border-transparent',
    inactive: 'hover:border-info hover:text-info',
  },
];

export function FilterPills({ activeFilter, onChange }: FilterPillsProps) {
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 touch-pan-x">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onChange(filter.value)}
          className={`filter-pill whitespace-nowrap active:scale-95 border shadow-sm ${
            activeFilter === filter.value
              ? filter.active
              : `bg-card border-border text-muted-foreground ${filter.inactive}`
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
