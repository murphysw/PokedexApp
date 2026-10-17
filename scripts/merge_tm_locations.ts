// merge_tm_locations.ts
import * as fs from 'fs';
import * as path from 'path';

// Paths
const tmsPath = path.resolve(__dirname, '../assets/data/tms.json');
const cleanMovesPath = path.resolve(__dirname, '../assets/data/clean_moves.json');

// Load data
const tmsDataRaw = fs.readFileSync(tmsPath, 'utf-8');
const cleanMovesRaw = fs.readFileSync(cleanMovesPath, 'utf-8');

const tmsData = JSON.parse(tmsDataRaw) as Record<string, any[]>;
const cleanMoves = JSON.parse(cleanMovesRaw) as any[];

// Helper to get location string from clean entry
function extractLocation(entry: any): string | null {
  const locPrice = entry.locations_and_prices as string[];
  for (const item of locPrice) {
    // ignore price strings (contain digits or currency symbols) and 'N/A'
    if (!item || item.toUpperCase() === 'N/A') continue;
    // simple heuristic: if starts with digit or contains symbols like '₽' or ends with 'C', treat as price
    const trimmed = item.trim();
    if (/^[0-9]/.test(trimmed) || /[0-9]C$/.test(trimmed) || /₽/.test(trimmed)) continue;
    // also ignore wiki markup like {{rt|...}}
    const cleaned = trimmed.replace(/\{\{.*?\}\}/g, '').trim();
    if (cleaned) return cleaned;
  }
  return null;
}

// Map generation to versionGroup keys
const generationMap: Record<string, string[]> = {
  'Generation I': ['red-blue', 'yellow'],
  'Generation II': ['gold-silver', 'crystal'],
  // Generation III covers many version groups; we map to a broad list
  'Generation III': [
    'ruby-sapphire',
    'emerald',
    'firered-leafgreen',
    'colosseum',
    'xd',
  ],
  // Add future generations if needed
};

// Build lookup for clean moves: key = `${gen}|${category}|${number}`
const cleanLookup = new Map<string, string | null>();
for (const entry of cleanMoves) {
  const gen = entry.generation as string;
  const cat = entry.category as string; // TM or HM
  const number = entry.number as string;
  const key = `${gen}|${cat}|${number}`;
  const loc = extractLocation(entry);
  cleanLookup.set(key, loc);
}

// Merge locations into tms data
for (const [groupKey, items] of Object.entries(tmsData)) {
  // Determine generation based on groupKey
  let gen = '';
  if (groupKey.includes('red') || groupKey.includes('yellow')) gen = 'Generation I';
  else if (groupKey.includes('gold') || groupKey.includes('silver') || groupKey.includes('crystal')) gen = 'Generation II';
  else gen = 'Generation III'; // fallback

  for (const item of items) {
    const cat = item.isHm ? 'HM' : 'TM';
    const number = String(item.number).padStart(2, '0');
    const lookupKey = `${gen}|${cat}|${number}`;
    if (cleanLookup.has(lookupKey)) {
      item.location = cleanLookup.get(lookupKey);
    } else {
      // No matching location; keep undefined
    }
  }
}

// Write back merged tms.json (pretty printed)
fs.writeFileSync(tmsPath, JSON.stringify(tmsData, null, 2), 'utf-8');
console.log('TM data merged with locations successfully.');

