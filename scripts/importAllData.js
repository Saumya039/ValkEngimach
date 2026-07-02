import * as xlsx from 'xlsx/xlsx.mjs';
import * as fs from 'fs';
xlsx.set_fs(fs);
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

function parseExcelDate(dateVal) {
  let finalDateStr = '';
  
  if (!dateVal) {
    finalDateStr = new Date().toISOString().split('T')[0];
  } else if (typeof dateVal === 'number') {
    // 25569 is Jan 1 1970
    finalDateStr = new Date(Math.round((dateVal - 25569) * 86400 * 1000)).toISOString().split('T')[0];
  } else if (typeof dateVal === 'string') {
    const parts = dateVal.trim().split(/[-\/]/);
    if (parts.length === 3) {
      let [dd, mm, yyyy] = parts;
      if (yyyy.length === 2) yyyy = '20' + yyyy;
      finalDateStr = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    } else {
      const d = new Date(dateVal);
      finalDateStr = !isNaN(d.valueOf()) ? d.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    }
  } else {
    finalDateStr = new Date().toISOString().split('T')[0];
  }

  // Fix anomalous years caused by Excel typos (e.g., 2029 or 20926)
  let [y, m, d] = finalDateStr.split('-');
  // If year is weird (like +020926 or just 2029) we just force it to 2026
  if (y.length > 4 || parseInt(y) > 2026) {
    y = '2026';
    finalDateStr = `${y}-${m}-${d}`;
  }
  return finalDateStr;
}

async function run() {
  console.log('Clearing old data...');
  await supabase.from('cash_in').delete().neq('id', 'temp');
  await supabase.from('expenses').delete().neq('id', 'temp');

  console.log('Reading Excel file...');
  const workbook = xlsx.readFile('C:\\Users\\saumy\\Downloads\\Valk_Engimach_Website_updated\\CASH LEGER.xlsx');
  
  // 1. Parse Cash In
  const cashInSheet = workbook.Sheets['Cash In'];
  if (cashInSheet) {
    const cashData = xlsx.utils.sheet_to_json(cashInSheet);
    const cashEntries = [];
    for (const row of cashData) {
      if (!row.Amount || typeof row.Amount !== 'number') continue;
      cashEntries.push({
        id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 9),
        date: parseExcelDate(row.Date),
        amount: Number(row.Amount),
        category: row.Category || 'Other',
        description: String(row['Remarks/ Reference etc.'] || row.Description || 'Imported Entry'),
        type: 'credit'
      });
    }
    if (cashEntries.length > 0) {
      const { error } = await supabase.from('cash_in').insert(cashEntries);
      if (error) console.error('Error cash_in:', error);
      else console.log(`Inserted ${cashEntries.length} cash in entries.`);
    }
  }

  // 2. Parse Expenses
  const expSheet = workbook.Sheets['Expanse'];
  if (expSheet) {
    const expData = xlsx.utils.sheet_to_json(expSheet);
    const expEntries = [];
    for (const row of expData) {
      if (!row.Amount || typeof row.Amount !== 'number') continue;
      expEntries.push({
        id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 9),
        date: parseExcelDate(row.Date),
        amount: Number(row.Amount),
        category: row.Category || 'Other',
        description: String(row.Description || 'Imported Entry')
      });
    }
    if (expEntries.length > 0) {
      for (let i = 0; i < expEntries.length; i += 500) {
        const batch = expEntries.slice(i, i + 500);
        const { error } = await supabase.from('expenses').insert(batch);
        if (error) console.error('Error expenses batch:', error);
      }
      console.log(`Inserted ${expEntries.length} expense entries.`);
    }
  }
}
run();
