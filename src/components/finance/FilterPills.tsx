export type FilterType = 'all' | 'income' | 'expense' | 'scheduled';

interface FilterPillsProps {
  activeFilter: FilterType;
  onChange: (filter: FilterType) => void;
}

const filters: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'income', label: 'Entradas' },
  { value: 'expense', label: 'Saídas' },
  { value: 'scheduled', label: 'Agendados' },
];

export function FilterPills({ activeFilter, onChange }: FilterPillsProps) {
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onChange(filter.value)}
          className={`filter-pill active:scale-95 ${
            activeFilter === filter.value
              ? 'filter-pill-active'
              : 'filter-pill-inactive'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
