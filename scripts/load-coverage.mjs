// scripts/load-coverage.mjs — Carga la matriz de cobertura COD ciudad×transportadora a Supabase
// Uso: node scripts/load-coverage.mjs "Destinos con Recaudo.xlsx" --cod=true
//      node scripts/load-coverage.mjs "Destinos Sin Recaudo.xlsx" --cod=false
// Requiere: npm i xlsx @supabase/supabase-js  y  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.
import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';

const [file, codFlag] = process.argv.slice(2);
if (!file) { console.error('Falta el archivo .xlsx'); process.exit(1); }
const cod = (codFlag || '--cod=true').includes('true');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const wb = xlsx.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

// Formato Dropi: fila de headers = nombres de transportadoras; cada columna lista "CIUDAD - DEPARTAMENTO"
const headerRowIdx = rows.findIndex(r => (r || []).filter(c => typeof c === 'string' && c.trim()).length >= 5);
const headers = rows[headerRowIdx].map(h => (h || '').toString().trim().toUpperCase());
const records = [];
for (let i = headerRowIdx + 1; i < rows.length; i++) {
  (rows[i] || []).forEach((cell, col) => {
    const carrier = headers[col];
    if (!carrier || !cell || typeof cell !== 'string') return;
    const raw = cell.trim();
    if (!raw || raw.length < 3) return;
    const [city, department] = raw.split(/\s+-\s+/).map(s => (s || '').trim().toUpperCase());
    if (!city) return;
    records.push({ pais: 'CO', carrier, city, department: department || null, cod });
  });
}
console.log(`Parseados ${records.length} registros. Insertando en lotes de 1000...`);
for (let i = 0; i < records.length; i += 1000) {
  const { error } = await sb.from('zynex_carrier_coverage').upsert(records.slice(i, i + 1000), { onConflict: 'pais,carrier,city,cod', ignoreDuplicates: true });
  if (error) console.error('Lote', i, error.message);
  else console.log('Lote', i, 'OK');
}
console.log('Cobertura cargada ✅');
