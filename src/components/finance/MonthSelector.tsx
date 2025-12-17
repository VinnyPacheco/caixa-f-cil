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
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[65%] justify-end">
      <button
        onClick={() => onChange(prevMonth)}
        className="month-pill"
      >
        {formatMonth(prevMonth, true)}
      </button>
      <button className="month-pill-active capitalize">
        {formatMonth(currentDate)}
      </button>
      <button
        onClick={() => onChange(nextMonth)}
        className="month-pill"
      >
        {formatMonth(nextMonth, true)}
      </button>
    </div>
  );
}
