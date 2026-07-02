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
  // 1. Update Users
  console.log('Updating users...');
  
  // Clear old users
  await supabase.from('users').delete().neq('id', 'temp_id_that_doesnt_exist');
  
  // Insert new users
  const { data, error } = await supabase.from('users').insert([
    { id: 'Admin', pin: 'ILoveValk@261222', role: 'admin', name: 'Admin' },
    { id: 'Supervisor', pin: 'Supervisor@123', role: 'operator', name: 'Supervisor' }
  ]);
  
  if (error) console.error('Error updating users:', error);
  else console.log('Users updated successfully.');

  // 2. Parse Excel
  console.log('Reading Excel file...');
  const workbook = xlsx.readFile('C:\\Users\\saumy\\Downloads\\Valk_Engimach_Website_updated\\CASH LEGER.xlsx');
  
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data_json = xlsx.utils.sheet_to_json(sheet);
  
  console.log(`Found ${data_json.length} rows in Excel.`);
  
  const cashInEntries = [];
  
  for (const row of data_json) {
    if (!row.Amount) continue;
    
    // Excel date to ISO
    let dateStr = new Date().toISOString().split('T')[0];
    if (row.Date && typeof row.Date === 'number') {
      const jsDate = new Date((row.Date - (25567 + 2)) * 86400 * 1000);
      dateStr = jsDate.toISOString().split('T')[0];
    }
    
    cashInEntries.push({
      id: Date.now().toString() + Math.floor(Math.random() * 10000),
      date: dateStr,
      amount: row.Amount,
      category: row.Category || 'Other',
      description: row['Remarks/ Reference etc.'] || 'Imported Entry',
      type: 'credit'
    });
  }
  
  if (cashInEntries.length > 0) {
    console.log(`Inserting ${cashInEntries.length} entries into Supabase...`);
    const { error } = await supabase.from('cash_in').insert(cashInEntries);
    if (error) {
      console.error('Error inserting data:', error);
    } else {
      console.log('Successfully inserted all cash entries.');
    }
  }
}

run();
