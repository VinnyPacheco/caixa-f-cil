import { ImportParser } from './types';
import { itauParser } from './itauParser';
import { mercadoPagoParser } from './mercadoPagoParser';
import { interParser } from './interParser';

// Registry of all available parsers
export const importParsers: ImportParser[] = [
  itauParser,
  mercadoPagoParser,
  interParser,
  // Add new parsers here as needed
];

export function getParserById(id: string): ImportParser | undefined {
  return importParsers.find(parser => parser.id === id);
}

export * from './types';
