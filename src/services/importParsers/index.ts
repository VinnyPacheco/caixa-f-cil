import { ImportParser } from './types';
import { itauParser } from './itauParser';
import { mercadoPagoParser } from './mercadoPagoParser';

// Registry of all available parsers
export const importParsers: ImportParser[] = [
  itauParser,
  mercadoPagoParser,
  // Add new parsers here as needed
];

export function getParserById(id: string): ImportParser | undefined {
  return importParsers.find(parser => parser.id === id);
}

export * from './types';
