// merge_tm_locations.js
const fs = require('fs');
const path = require('path');

// Paths relative to project root
const tmsPath = path.resolve(__dirname, '../assets/data/tms.json');
const cleanMovesPath = path.resolve(__dirname, '../assets/data/clean_moves.json');

// Load JSON data
const tmsData = JSON.parse(fs.readFileSync(tmsPath, 'utf-8'));
const cleanMoves = JSON.parse(fs.readFileSync(cleanMovesPath, 'utf-8'));

// Helper to extract a readable location string from a clean move entry
function extractLocation(entry) {
  const locPrice = entry.locations_and_prices || [];
  for (const item of locPrice) {
    if (!item) continue;
    const upper = item.toUpperCase();
    if (upper === 'N/A') continue;
    // Skip pure price strings (contain digits, currency symbols, or end with 'C')
    if (/^[0-9]/.test(item) || /[0-9]C$/.test(item) || /₽/.test(item)) continue;
    // Remove simple wiki markup like {{rt|...}}
    const cleaned = item.replace(/\{\{.*?\}\}/g, '').trim();
    if (cleaned) return cleaned;
  }
  return null;
}

// Build a lookup map from clean moves: key = `${generation}|${category}|${number}`
const cleanLookup = new Map();
for (const entry of cleanMoves) {
  const gen = entry.generation;
  const cat = entry.category; // 'TM' or 'HM'
  const num = entry.number; // already string like "01"
  const key = `${gen}|${cat}|${num}`;
  cleanLookup.set(key, extractLocation(entry));
}

// Determine generation for each tms version group key
function generationFromGroupKey(groupKey) {
  if (groupKey.includes('red') || groupKey.includes('yellow')) return 'Generation I';
  if (groupKey.includes('gold') || groupKey.includes('silver') || groupKey.includes('crystal')) return 'Generation II';
  // Default to Generation III (covers ruby, sapphire, etc.)
  return 'Generation III';
}

// Merge location data into each TM/HM entry
for (const [groupKey, items] of Object.entries(tmsData)) {
  const gen = generationFromGroupKey(groupKey);
  for (const item of items) {
    const cat = item.isHm ? 'HM' : 'TM';
    const number = String(item.number).padStart(2, '0'); // ensure two‑digit format
    const lookupKey = `${gen}|${cat}|${number}`;
    if (cleanLookup.has(lookupKey)) {
      item.location = cleanLookup.get(lookupKey);
    }
  }
}

// Write merged data back (pretty‑printed)
fs.writeFileSync(tmsPath, JSON.stringify(tmsData, null, 2), 'utf-8');
console.log('TM/HM data merged with location field.');

