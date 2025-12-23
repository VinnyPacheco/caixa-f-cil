import { TransactionType, RecurrenceType, Category, Account } from '@/types/finance';
import { parse, addDays, addMonths, setDate, getDate, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ParsedTransaction {
  type?: TransactionType;
  amount?: number;
  description?: string;
  date?: Date;
  categoryName?: string;
  accountName?: string;
  recurrence?: RecurrenceType;
  installmentCount?: number;
  autoPay?: boolean;
}

// Patterns for expense keywords
const expenseKeywords = [
  'gastei', 'gasto', 'paguei', 'pagamento', 'comprei', 'compra', 
  'despesa', 'débito', 'saída', 'tirei', 'descontei', 'custo'
];

// Patterns for income keywords
const incomeKeywords = [
  'recebi', 'recebimento', 'ganhei', 'ganho', 'entrada', 'salário',
  'receita', 'crédito', 'entrou', 'depositei', 'depósito', 'renda'
];

// Common category mappings
const categoryMappings: Record<string, string[]> = {
  'Alimentação': ['mercado', 'supermercado', 'restaurante', 'lanche', 'comida', 'almoço', 'jantar', 'café'],
  'Transporte': ['uber', 'taxi', 'ônibus', 'metrô', 'gasolina', 'combustível', 'estacionamento', 'pedagio'],
  'Moradia': ['aluguel', 'condomínio', 'água', 'luz', 'energia', 'gás', 'internet', 'casa'],
  'Saúde': ['farmácia', 'remédio', 'médico', 'hospital', 'consulta', 'exame', 'plano de saúde'],
  'Educação': ['escola', 'faculdade', 'curso', 'livro', 'material escolar'],
  'Lazer': ['cinema', 'show', 'viagem', 'festa', 'bar', 'diversão', 'netflix', 'spotify'],
  'Vestuário': ['roupa', 'calçado', 'sapato', 'tênis', 'camisa', 'calça', 'vestido'],
  'Salário': ['salário', 'pagamento', 'holerite'],
  'Freelance': ['freelance', 'freela', 'trabalho extra', 'bico'],
};

// Account mappings
const accountMappings: Record<string, string[]> = {
  'Banco': ['banco', 'conta', 'débito', 'transferência', 'pix'],
  'Cartão': ['cartão', 'crédito', 'visa', 'mastercard', 'elo'],
  'Dinheiro': ['dinheiro', 'espécie', 'cash', 'cédula'],
  'Poupança': ['poupança', 'investimento', 'reserva'],
};

// Recurrence patterns
const installmentPatterns = [
  /(\d+)\s*(?:x|vezes|parcelas?)/i,
  /em\s*(\d+)\s*(?:x|vezes|parcelas?)/i,
  /parcelado?\s*em\s*(\d+)/i,
];

const recurringPatterns = [
  /todo\s*(?:mês|mes)/i,
  /mensal(?:mente)?/i,
  /recorrente/i,
  /fixo/i,
];

// Date patterns
const datePatterns = {
  today: /hoje/i,
  yesterday: /ontem/i,
  dayBeforeYesterday: /anteontem/i,
  tomorrow: /amanhã|amanha/i,
  thisMonth: /esse?\s*mês|este?\s*mês/i,
  nextMonth: /próximo\s*mês|proximo\s*mes/i,
  lastMonth: /mês\s*passado|mes\s*passado/i,
  specificDay: /dia\s*(\d{1,2})/i,
  fullDate: /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/,
};

function extractAmount(text: string): number | undefined {
  // Match patterns like "150 reais", "R$ 150,00", "150,50", "cento e cinquenta"
  const patterns = [
    /R\$\s*([\d.,]+)/i,
    /([\d.,]+)\s*(?:reais?|real)/i,
    /(?:de|por|no valor de)\s*([\d.,]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Clean and parse the number
      const numStr = match[1].replace(/\./g, '').replace(',', '.');
      const value = parseFloat(numStr);
      if (!isNaN(value)) {
        return value;
      }
    }
  }

  // Try to find standalone numbers
  const numbers = text.match(/\b(\d+(?:[.,]\d{1,2})?)\b/g);
  if (numbers && numbers.length > 0) {
    const numStr = numbers[0].replace(/\./g, '').replace(',', '.');
    const value = parseFloat(numStr);
    if (!isNaN(value) && value > 0) {
      return value;
    }
  }

  return undefined;
}

function extractDate(text: string): Date | undefined {
  const today = new Date();

  if (datePatterns.today.test(text)) {
    return today;
  }

  if (datePatterns.yesterday.test(text)) {
    return addDays(today, -1);
  }

  if (datePatterns.dayBeforeYesterday.test(text)) {
    return addDays(today, -2);
  }

  if (datePatterns.tomorrow.test(text)) {
    return addDays(today, 1);
  }

  if (datePatterns.nextMonth.test(text)) {
    return addMonths(today, 1);
  }

  if (datePatterns.lastMonth.test(text)) {
    return addMonths(today, -1);
  }

  // Specific day of current month
  const dayMatch = text.match(datePatterns.specificDay);
  if (dayMatch) {
    const day = parseInt(dayMatch[1], 10);
    if (day >= 1 && day <= 31) {
      return setDate(today, day);
    }
  }

  // Full date format
  const fullMatch = text.match(datePatterns.fullDate);
  if (fullMatch) {
    const day = parseInt(fullMatch[1], 10);
    const month = parseInt(fullMatch[2], 10) - 1;
    const year = fullMatch[3] 
      ? (fullMatch[3].length === 2 ? 2000 + parseInt(fullMatch[3], 10) : parseInt(fullMatch[3], 10))
      : today.getFullYear();
    
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return undefined;
}

function extractType(text: string): TransactionType | undefined {
  const lowerText = text.toLowerCase();

  for (const keyword of expenseKeywords) {
    if (lowerText.includes(keyword)) {
      return 'expense';
    }
  }

  for (const keyword of incomeKeywords) {
    if (lowerText.includes(keyword)) {
      return 'income';
    }
  }

  return undefined;
}

function extractCategory(text: string): string | undefined {
  const lowerText = text.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryMappings)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return category;
      }
    }
  }

  return undefined;
}

function extractAccount(text: string): string | undefined {
  const lowerText = text.toLowerCase();

  // Check for credit card patterns first (more specific)
  if (/cart[ãa]o\s*de\s*cr[eé]dito/i.test(text) || /no\s*cart[ãa]o/i.test(text)) {
    return 'Cartão';
  }

  for (const [account, keywords] of Object.entries(accountMappings)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return account;
      }
    }
  }

  return undefined;
}

function extractRecurrence(text: string): { type: RecurrenceType; installments?: number } {
  // Check for installments first
  for (const pattern of installmentPatterns) {
    const match = text.match(pattern);
    if (match) {
      const count = parseInt(match[1], 10);
      if (count >= 2 && count <= 72) {
        return { type: 'installment', installments: count };
      }
    }
  }

  // Check for recurring
  for (const pattern of recurringPatterns) {
    if (pattern.test(text)) {
      return { type: 'recurring' };
    }
  }

  return { type: 'once' };
}

function extractDescription(text: string, parsed: Partial<ParsedTransaction>): string {
  let description = text;

  // Remove common prefixes
  description = description
    .replace(/^(?:gastei|gasto|paguei|comprei|recebi|ganhei)\s*/i, '')
    .replace(/^(?:de|com|no|na|em|para|por)\s*/i, '');

  // Remove amount patterns
  description = description
    .replace(/R\$\s*[\d.,]+/gi, '')
    .replace(/[\d.,]+\s*(?:reais?|real)/gi, '')
    .replace(/\b\d+(?:[.,]\d{1,2})?\b/g, '');

  // Remove date patterns
  description = description
    .replace(/(?:hoje|ontem|anteontem|amanhã|amanha)/gi, '')
    .replace(/dia\s*\d{1,2}/gi, '')
    .replace(/\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/g, '');

  // Remove recurrence patterns
  description = description
    .replace(/\d+\s*(?:x|vezes|parcelas?)/gi, '')
    .replace(/parcelado?\s*em\s*\d+/gi, '')
    .replace(/(?:todo\s*mês|mensal(?:mente)?|recorrente|fixo)/gi, '');

  // Remove account patterns
  description = description
    .replace(/(?:no|na|pelo|pela)\s*(?:cartão|banco|débito|crédito|pix)/gi, '');

  // Clean up
  description = description
    .replace(/\s+/g, ' ')
    .trim();

  // Capitalize first letter
  if (description.length > 0) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }

  return description || 'Lançamento por voz';
}

export function parseVoiceTransaction(
  text: string,
  categories: Category[],
  accounts: Account[]
): ParsedTransaction {
  const parsed: ParsedTransaction = {};

  // Extract type
  parsed.type = extractType(text);

  // Extract amount
  parsed.amount = extractAmount(text);

  // Extract date
  parsed.date = extractDate(text);

  // Extract category name
  parsed.categoryName = extractCategory(text);

  // Extract account name
  parsed.accountName = extractAccount(text);

  // Extract recurrence
  const recurrence = extractRecurrence(text);
  parsed.recurrence = recurrence.type;
  parsed.installmentCount = recurrence.installments;

  // Check for auto-pay
  if (/baixa\s*autom[aá]tica/i.test(text) || /auto\s*(?:baixa|pagar|pago)/i.test(text)) {
    parsed.autoPay = true;
  }

  // Extract description (what's left after removing other patterns)
  parsed.description = extractDescription(text, parsed);

  return parsed;
}

export function matchCategoryByName(
  categoryName: string | undefined,
  categories: Category[],
  type: TransactionType
): string | undefined {
  if (!categoryName) return undefined;

  const lowerName = categoryName.toLowerCase();
  const filtered = categories.filter(c => c.type === type);

  // Try exact match first
  const exactMatch = filtered.find(c => c.name.toLowerCase() === lowerName);
  if (exactMatch) return exactMatch.id;

  // Try partial match
  const partialMatch = filtered.find(c => 
    c.name.toLowerCase().includes(lowerName) || 
    lowerName.includes(c.name.toLowerCase())
  );
  if (partialMatch) return partialMatch.id;

  return undefined;
}

export function matchAccountByName(
  accountName: string | undefined,
  accounts: Account[]
): string | undefined {
  if (!accountName) return undefined;

  const lowerName = accountName.toLowerCase();

  // Try exact match first
  const exactMatch = accounts.find(a => a.name.toLowerCase() === lowerName);
  if (exactMatch) return exactMatch.id;

  // Try partial match
  const partialMatch = accounts.find(a => 
    a.name.toLowerCase().includes(lowerName) || 
    lowerName.includes(a.name.toLowerCase())
  );
  if (partialMatch) return partialMatch.id;

  return undefined;
}
