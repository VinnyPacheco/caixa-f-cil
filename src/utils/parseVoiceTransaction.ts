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

// Month name to number mapping
const monthNameToNumber: Record<string, number> = {
  'janeiro': 0, 'jan': 0,
  'fevereiro': 1, 'fev': 1,
  'março': 2, 'marco': 2, 'mar': 2,
  'abril': 3, 'abr': 3,
  'maio': 4, 'mai': 4,
  'junho': 5, 'jun': 5,
  'julho': 6, 'jul': 6,
  'agosto': 7, 'ago': 7,
  'setembro': 8, 'set': 8,
  'outubro': 9, 'out': 9,
  'novembro': 10, 'nov': 10,
  'dezembro': 11, 'dez': 11,
};

// Date patterns
const datePatterns = {
  today: /hoje/i,
  yesterday: /ontem/i,
  dayBeforeYesterday: /anteontem/i,
  tomorrow: /amanhã|amanha/i,
  thisMonth: /esse?\s*mês|este?\s*mês/i,
  nextMonth: /próximo\s*mês|proximo\s*mes/i,
  lastMonth: /mês\s*passado|mes\s*passado/i,
  // Full date with month name: "dia 5 de janeiro de 2026" or "5 de janeiro de 2026"
  fullDateWithMonthName: /(?:dia\s*)?(\d{1,2})\s*(?:de\s*)?(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)(?:\s*(?:de\s*)?(\d{4}|\d{2}))?/i,
  specificDay: /dia\s*(\d{1,2})(?!\s*(?:de\s*)?(?:janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez))/i,
  fullDate: /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/,
};

function normalizeTextForDateParsing(text: string) {
  return text
    .toLowerCase()
    .replace(/[.,!?;:()[\]{}"“”'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePtNumberWordsToInt(input: string): number | undefined {
  const s = normalizeTextForDateParsing(input);
  if (!s) return undefined;

  // If there are digits, prefer them.
  const digitMatch = s.match(/\b\d+\b/);
  if (digitMatch) {
    const n = parseInt(digitMatch[0], 10);
    return Number.isFinite(n) ? n : undefined;
  }

  const units: Record<string, number> = {
    zero: 0,
    um: 1,
    uma: 1,
    dois: 2,
    tres: 3,
    três: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
    sete: 7,
    oito: 8,
    nove: 9,
  };

  const teens: Record<string, number> = {
    dez: 10,
    onze: 11,
    doze: 12,
    treze: 13,
    catorze: 14,
    quatorze: 14,
    quinze: 15,
    dezesseis: 16,
    dezasseis: 16,
    dezessete: 17,
    dezoito: 18,
    dezenove: 19,
  };

  const tens: Record<string, number> = {
    vinte: 20,
    trinta: 30,
    quarenta: 40,
    cinquenta: 50,
    sessenta: 60,
    setenta: 70,
    oitenta: 80,
    noventa: 90,
  };

  const hundreds: Record<string, number> = {
    cem: 100,
    cento: 100,
    duzentos: 200,
    trezentos: 300,
    quatrocentos: 400,
    quinhentos: 500,
    seiscentos: 600,
    setecentos: 700,
    oitocentos: 800,
    novecentos: 900,
  };

  const tokens = s.split(' ').filter(Boolean);
  let total = 0;
  let current = 0;
  let consumedAny = false;

  for (const token of tokens) {
    if (token === 'e' || token === 'de' || token === 'do' || token === 'da' || token === 'dia') continue;

    if (token === 'mil') {
      consumedAny = true;
      if (current === 0) current = 1;
      total += current * 1000;
      current = 0;
      continue;
    }

    const h = hundreds[token];
    if (h !== undefined) {
      consumedAny = true;
      current += h;
      continue;
    }

    const t = tens[token];
    if (t !== undefined) {
      consumedAny = true;
      current += t;
      continue;
    }

    const teen = teens[token];
    if (teen !== undefined) {
      consumedAny = true;
      current += teen;
      continue;
    }

    const u = units[token];
    if (u !== undefined) {
      consumedAny = true;
      current += u;
      continue;
    }
  }

  if (!consumedAny) return undefined;
  return total + current;
}

function tryExtractDateWithMonthName(text: string, today: Date): Date | undefined {
  const normalized = normalizeTextForDateParsing(text);

  const monthRegex =
    /(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i;
  const monthExec = monthRegex.exec(normalized);
  if (!monthExec || monthExec.index === undefined) return undefined;

  const monthName = monthExec[1].toLowerCase();
  const month = monthNameToNumber[monthName];
  if (month === undefined) return undefined;

  const before = normalized.slice(0, monthExec.index).trim();
  const after = normalized.slice(monthExec.index + monthExec[1].length).trim();

  // Day: prefer digits near the month; otherwise parse number words (e.g., "cinco", "vinte e seis").
  let day: number | undefined;
  const digitDays = [...before.matchAll(/\b(\d{1,2})\b/g)];
  if (digitDays.length > 0) {
    day = parseInt(digitDays[digitDays.length - 1][1], 10);
  } else {
    const dayWindow = before.split(' ').slice(-8).join(' ');
    const parsedDay = parsePtNumberWordsToInt(dayWindow);
    if (parsedDay !== undefined) day = parsedDay;
  }

  if (!day || day < 1 || day > 31) return undefined;

  // Year: digits OR number words (e.g., "dois mil e vinte e seis").
  let year = today.getFullYear();
  const yearDigits = after.match(/\b(\d{2,4})\b/);
  if (yearDigits) {
    const yearStr = yearDigits[1];
    year = yearStr.length === 2 ? 2000 + parseInt(yearStr, 10) : parseInt(yearStr, 10);
  } else {
    const yearWindow = after.split(' ').slice(0, 16).join(' ');
    const parsedYear = parsePtNumberWordsToInt(yearWindow);
    if (parsedYear !== undefined && parsedYear >= 1000 && parsedYear <= 3000) {
      year = parsedYear;
    }
  }

  const date = new Date(year, month, day);

  // Guard against overflow (e.g., 31/02) which JS auto-normalizes.
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return undefined;
  }

  return date;
}

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

  // Month name date (supports digits and numbers in full words)
  const monthNameDate = tryExtractDateWithMonthName(text, today);
  if (monthNameDate) return monthNameDate;

  // Specific day of current month (only when user literally says "dia 5")
  const dayMatch = text.match(datePatterns.specificDay);
  if (dayMatch) {
    const day = parseInt(dayMatch[1], 10);
    if (day >= 1 && day <= 31) {
      return setDate(today, day);
    }
  }

  // Full date format (numeric): 05/01/2026
  const fullMatch = text.match(datePatterns.fullDate);
  if (fullMatch) {
    const day = parseInt(fullMatch[1], 10);
    const month = parseInt(fullMatch[2], 10) - 1;
    const year = fullMatch[3]
      ? fullMatch[3].length === 2
        ? 2000 + parseInt(fullMatch[3], 10)
        : parseInt(fullMatch[3], 10)
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

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim();
}

function extractCategory(text: string, categories: Category[]): string | undefined {
  const lowerText = text.toLowerCase();
  const normalizedText = normalizeForComparison(text);

  // Priority 1: Direct match - check if any user category name appears in the text
  // Sort by name length (longest first) to match compound names like "Renda extra" before "Renda"
  const sortedCategories = [...categories].sort((a, b) => b.name.length - a.name.length);
  
  for (const category of sortedCategories) {
    const categoryNameLower = category.name.toLowerCase();
    const categoryNameNormalized = normalizeForComparison(category.name);
    
    // Check exact match (with accents)
    if (lowerText.includes(categoryNameLower)) {
      return category.name;
    }
    
    // Check normalized match (without accents)
    if (normalizedText.includes(categoryNameNormalized)) {
      return category.name;
    }
  }

  // Priority 2: Fallback to keyword mappings
  for (const [category, keywords] of Object.entries(categoryMappings)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return category;
      }
    }
  }

  return undefined;
}

function extractAccount(text: string, accounts: Account[]): string | undefined {
  const lowerText = text.toLowerCase();
  const normalizedText = normalizeForComparison(text);

  // Priority 1: Direct match - check if any user account name appears in the text
  // Sort by name length (longest first) to match compound names like "Mercado Pago" before "Mercado"
  const sortedAccounts = [...accounts].sort((a, b) => b.name.length - a.name.length);
  
  for (const account of sortedAccounts) {
    const accountNameLower = account.name.toLowerCase();
    const accountNameNormalized = normalizeForComparison(account.name);
    
    // Check exact match (with accents)
    if (lowerText.includes(accountNameLower)) {
      return account.name;
    }
    
    // Check normalized match (without accents)
    if (normalizedText.includes(accountNameNormalized)) {
      return account.name;
    }
  }

  // Priority 2: Check for credit card patterns (fallback to keyword mappings)
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

// Stop-words to remove from description
const stopWords = new Set([
  // Prepositions and connectors
  'a', 'o', 'e', 'é', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
  'para', 'por', 'pelo', 'pela', 'pelos', 'pelas', 'com', 'sem', 'sobre', 'entre',
  'um', 'uma', 'uns', 'umas', 'ao', 'aos', 'à', 'às', 'que', 'se',
  
  // Date-related words
  'data', 'dia', 'hoje', 'ontem', 'anteontem', 'amanhã', 'amanha', 'semana', 'mês', 'mes', 'ano',
  'segunda', 'terça', 'terca', 'quarta', 'quinta', 'sexta', 'sábado', 'sabado', 'domingo',
  'janeiro', 'fevereiro', 'março', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  'próximo', 'proximo', 'próxima', 'proxima', 'passado', 'passada', 'último', 'ultimo', 'última', 'ultima',
  
  // Value-related words
  'reais', 'real', 'r$', 'valor', 'total', 'preço', 'preco', 'custo', 'quantia',
  'centavos', 'mil', 'milhão', 'milhao', 'bilhão', 'bilhao',
  
  // Transaction action words
  'gastei', 'gasto', 'paguei', 'pago', 'pagamento', 'comprei', 'compra', 'comprado',
  'recebi', 'recebido', 'recebimento', 'ganhei', 'ganho', 'tirei', 'descontei',
  'depositei', 'depósito', 'deposito', 'transferi', 'transferência', 'transferencia',
  
  // Recurrence words
  'parcela', 'parcelas', 'parcelado', 'parcelada', 'vezes', 'mensal', 'mensalmente',
  'recorrente', 'fixo', 'fixa', 'todo', 'toda', 'todos', 'todas',
  
  // Account-related words
  'cartão', 'cartao', 'banco', 'conta', 'débito', 'debito', 'crédito', 'credito',
  'pix', 'dinheiro', 'espécie', 'especie', 'poupança', 'poupanca', 'categoria',
  
  // Auto-pay words
  'baixa', 'automática', 'automatica', 'auto',
  
  // Common filler words
  'foi', 'ser', 'será', 'sera', 'estava', 'estou', 'tenho', 'tinha', 'vai', 'vou',
  'fazer', 'feito', 'fiz', 'isso', 'isso', 'esse', 'essa', 'este', 'esta',
  'meu', 'minha', 'meus', 'minhas', 'seu', 'sua', 'seus', 'suas',
  'aqui', 'ali', 'lá', 'la', 'agora', 'já', 'ja', 'ainda', 'só', 'so', 'apenas',
]);

function normalizeDescription(text: string): string {
  // Split into words
  const words = text
    .toLowerCase()
    .replace(/[.,!?;:()[\]{}""'']/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
  
  // Remove stop-words and numbers
  const filteredWords = words.filter(word => {
    // Skip stop-words
    if (stopWords.has(word)) return false;
    
    // Skip pure numbers
    if (/^\d+([.,]\d+)?$/.test(word)) return false;
    
    return true;
  });
  
  // Take only the first relevant word(s) - prioritize the main subject
  const result = filteredWords.slice(0, 2).join(' ');
  
  // Capitalize first letter of each word
  return result
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function extractDescription(text: string, parsed: Partial<ParsedTransaction>): string {
  // First, normalize the text by removing stop-words
  const normalized = normalizeDescription(text);
  
  if (normalized.length > 0) {
    return normalized;
  }
  
  return 'Lançamento por voz';
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

  // Extract category name (pass categories for dynamic matching)
  parsed.categoryName = extractCategory(text, categories);

  // Extract account name (pass accounts for dynamic matching)
  parsed.accountName = extractAccount(text, accounts);

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
