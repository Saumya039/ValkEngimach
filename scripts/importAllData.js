import * as xlsx from 'xlsx/xlsx.mjs';
import * as fs from 'fs';
xlsx.set_fs(fs);
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

function parseExcelDate(dateVal, swapMonthDay) {
  let finalDateStr = '';
  
  if (!dateVal) {
    finalDateStr = new Date().toISOString().split('T')[0];
  } else if (typeof dateVal === 'number') {
    // 25569 is Jan 1 1970
    finalDateStr = new Date(Math.round((dateVal - 25569) * 86400 * 1000)).toISOString().split('T')[0];
    
    // If we suspect the user typed D/M/YYYY into US-locale Excel, 
    // Excel might have mistakenly parsed it as M/D/YYYY.
    // e.g. user types "8/11/2025" (Nov 8), Excel parses as Aug 11 (2025-08-11).
    // We swap the month and day to get 2025-11-08, BUT ONLY if the new month <= 12.
    if (swapMonthDay) {
      let [y, m, d] = finalDateStr.split('-');
      if (parseInt(d) <= 12) {
        finalDateStr = `${y}-${d}-${m}`;
      }
    }
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
  // Delete all except 'temp' which might be our default test row if we have one.
  // Actually we'll just delete everything for a clean slate.
  await supabase.from('cash_in').delete().neq('id', 'temp');
  await supabase.from('expenses').delete().neq('id', 'temp');

  console.log('Reading Excel file...');
  const workbook = xlsx.readFile('C:\\Users\\saumy\\Downloads\\Valk_Engimach_Website_updated\\Cash Register 1.xlsx');
  
  // 1. Parse Cash In
  const cashInSheet = workbook.Sheets['Cash In'];
  if (cashInSheet) {
    const data = xlsx.utils.sheet_to_json(cashInSheet);
    const entries = [];
    data.forEach((row, idx) => {
      if (!row.Amount || typeof row.Amount !== 'number') return;
      
      // The user used M/D/YYYY up to row 22, and D/M/YYYY afterwards.
      const swapMonthDay = idx >= 23;
      let dateStr = parseExcelDate(row.Date, swapMonthDay);

      entries.push({
        id: Date.now().toString() + Math.floor(Math.random() * 100000),
        date: dateStr,
        amount: row.Amount,
        category: row.Category || 'Other',
        description: row['Remarks/ Reference etc.'] || row.Description || 'Imported Cash In',
        type: 'credit'
      });
    });
    
    if (entries.length > 0) {
      const { error } = await supabase.from('cash_in').insert(entries);
      if (error) console.error('Cash In Error:', error.message);
      else console.log(`Inserted ${entries.length} cash in entries.`);
    }
  }

  // 2. Parse Expenses
  const expSheet = workbook.Sheets['Expanse'];
  if (expSheet) {
    const data = xlsx.utils.sheet_to_json(expSheet);
    const entries = [];
    data.forEach((row) => {
      if (!row.Amount || typeof row.Amount !== 'number') return;
      
      // The user used D/M/YYYY everywhere in Expanse sheet
      let dateStr = parseExcelDate(row.Date, true);
      entries.push({
        id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 9),
        date: dateStr,
        amount: Number(row.Amount),
        category: row.Category || 'Other',
        description: String(row.Description || 'Imported Entry')
      });
    });
    if (entries.length > 0) {
      for (let i = 0; i < entries.length; i += 500) {
        const batch = entries.slice(i, i + 500);
        const { error } = await supabase.from('expenses').insert(batch);
        if (error) console.error('Error expenses batch:', error);
      }
      console.log(`Inserted ${entries.length} expense entries.`);
    }
  }
}
run();
