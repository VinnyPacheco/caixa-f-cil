import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthSelectorProps {
  currentDate: Date;
  onChange: (date: Date) => void;
}

export function MonthSelector({ currentDate, onChange }: MonthSelectorProps) {
  const prevMonth = subMonths(currentDate, 1);
  const nextMonth = addMonths(currentDate, 1);

  const formatMonth = (date: Date, abbreviated = false) => {
    if (abbreviated) {
      return format(date, "MMM/yy", { locale: ptBR });
    }
    return format(date, "MMMM/yy", { locale: ptBR });
  };

  return (
    <div className="flex items-center gap-2 w-full justify-center">
      <button
        onClick={() => onChange(prevMonth)}
        className="month-pill capitalize"
      >
        {formatMonth(prevMonth)}
      </button>
      <button className="month-pill-active capitalize">
        {formatMonth(currentDate)}
      </button>
      <button
        onClick={() => onChange(nextMonth)}
        className="month-pill capitalize"
      >
        {formatMonth(nextMonth)}
      </button>
    </div>
  );
}
