import * as xlsx from 'xlsx/xlsx.mjs';
import * as fs from 'fs';
xlsx.set_fs(fs);
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Clearing old expenses...');
  await supabase.from('expenses').delete().neq('id', 'temp');

  console.log('Reading Excel file...');
  const workbook = xlsx.readFile('C:\\Users\\saumy\\Downloads\\Valk_Engimach_Website_updated\\CASH LEGER.xlsx');
  
  const sheet = workbook.Sheets['Expanse'];
  const data_json = xlsx.utils.sheet_to_json(sheet);
  
  console.log(`Found ${data_json.length} rows in Expanse sheet.`);
  
  const entries = [];
  
  for (const row of data_json) {
    if (!row.Amount || typeof row.Amount !== 'number') continue;
    
    // Excel date to ISO
    let dateStr = new Date().toISOString().split('T')[0];
    if (row.Date && typeof row.Date === 'number') {
      const jsDate = new Date((row.Date - (25567 + 2)) * 86400 * 1000);
      dateStr = jsDate.toISOString().split('T')[0];
    }
    
    entries.push({
      id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 9),
      date: dateStr,
      amount: Number(row.Amount),
      category: row.Category || 'Other',
      description: String(row.Description) || 'Imported Entry'
    });
  }
  
  if (entries.length > 0) {
    console.log(`Inserting ${entries.length} entries into expenses...`);
    // Supabase allows max 1000 rows per insert, but since it's close to 1000, we batch it just in case.
    for (let i = 0; i < entries.length; i += 500) {
      const batch = entries.slice(i, i + 500);
      const { error } = await supabase.from('expenses').insert(batch);
      if (error) {
        console.error('Error inserting data batch:', error);
      } else {
        console.log(`Inserted batch ${i} to ${i + batch.length}.`);
      }
    }
    console.log('Finished inserting expenses.');
  }
}

run();
