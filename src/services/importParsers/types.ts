export interface ParsedTransaction {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

export interface ImportParser {
  id: string;
  name: string;
  fileExtension: string;
  parse: (fileContent: string) => ParsedTransaction[];
}
