import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TransactionWithBalance } from '@/types/finance';
import { formatCurrency } from './format';

export interface ExportMeta {
  monthLabel: string;
  tab: string;
  filterType: string;
  categoryName?: string;
  tagNames?: string[];
}

const typeLabel = (t: string) => (t === 'income' ? 'Receita' : 'Despesa');

const rows = (txs: TransactionWithBalance[]) =>
  txs.map((t) => [
    format(new Date(t.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }),
    t.description,
    t.category?.name || '-',
    t.account?.name || '-',
    typeLabel(t.type),
    t.isPaid ? 'Pago' : 'Pendente',
    formatCurrency(t.amount),
  ]);

const csvEscape = (v: string) => {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportReportCSV(txs: TransactionWithBalance[], meta: ExportMeta) {
  const header = ['Data', 'Descrição', 'Categoria', 'Conta', 'Tipo', 'Status', 'Valor'];
  const lines = [header, ...rows(txs)]
    .map((r) => r.map(csvEscape).join(';'))
    .join('\n');
  const totalIncome = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const summary =
    `\n\nResumo;;;;;;` +
    `\nTotal Receitas;;;;;;${formatCurrency(totalIncome)}` +
    `\nTotal Despesas;;;;;;${formatCurrency(totalExpense)}` +
    `\nSaldo;;;;;;${formatCurrency(totalIncome - totalExpense)}`;
  const filtersInfo =
    `Mês;${meta.monthLabel}\nAba;${meta.tab}\nTipo;${meta.filterType}` +
    (meta.categoryName ? `\nCategoria;${meta.categoryName}` : '') +
    (meta.tagNames && meta.tagNames.length ? `\nTags;${meta.tagNames.join(', ')}` : '') +
    '\n\n';
  const csv = '\uFEFF' + filtersInfo + lines + summary;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `relatorio-${meta.monthLabel}.csv`);
}

export function exportReportPDF(txs: TransactionWithBalance[], meta: ExportMeta) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFontSize(16);
  doc.text('Relatório Financeiro', 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(100);
  const lines = [
    `Mês: ${meta.monthLabel}`,
    `Aba: ${meta.tab}`,
    `Tipo: ${meta.filterType}`,
    meta.categoryName ? `Categoria: ${meta.categoryName}` : '',
    meta.tagNames && meta.tagNames.length ? `Tags: ${meta.tagNames.join(', ')}` : '',
    `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
  ].filter(Boolean);
  lines.forEach((l, i) => doc.text(l, 40, 60 + i * 14));

  const startY = 60 + lines.length * 14 + 10;

  autoTable(doc, {
    startY,
    head: [['Data', 'Descrição', 'Categoria', 'Conta', 'Tipo', 'Status', 'Valor']],
    body: rows(txs),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    columnStyles: { 6: { halign: 'right' } },
    margin: { left: 40, right: 40 },
  });

  const totalIncome = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY;
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Total Receitas: ${formatCurrency(totalIncome)}`, 40, finalY + 24);
  doc.text(`Total Despesas: ${formatCurrency(totalExpense)}`, 40, finalY + 40);
  doc.setFont(undefined as unknown as string, 'bold');
  doc.text(`Saldo: ${formatCurrency(totalIncome - totalExpense)}`, 40, finalY + 56);

  doc.save(`relatorio-${meta.monthLabel}.pdf`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}