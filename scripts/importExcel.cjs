const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Target paths
const cashFile = path.join(__dirname, '../Cash Register_VEPL valk credit sys.xlsx');
const machineFile = path.join(__dirname, '../Machining Hour Record.xlsx');
const outFile = path.join(__dirname, '../src/data/seedData.json');

const seedData = {
  cash_in: [],
  expenses: [],
  machine_logs: []
};

const safeDate = (val) => {
  if (!val) return new Date().toISOString();
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      // Try parsing DD/MM/YYYY
      if (typeof val === 'string') {
        const parts = val.split(/[-/]/);
        if (parts.length === 3) {
           const d2 = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
           if (!isNaN(d2.getTime())) return d2.toISOString();
        }
      }
      return new Date().toISOString();
    }
    return d.toISOString();
  } catch (e) {
    return new Date().toISOString();
  }
};

// 1. Process Cash File
if (fs.existsSync(cashFile)) {
  const workbook = xlsx.readFile(cashFile);
  
  // Assuming 'Cash In' sheet
  if (workbook.Sheets['Cash In']) {
    const cashInData = xlsx.utils.sheet_to_json(workbook.Sheets['Cash In'], { raw: false, dateNF: 'yyyy-mm-dd' });
    seedData.cash_in = cashInData.map((row, i) => ({
      id: `seed_c_${i}`,
      type: 'credit',
      date: safeDate(row.Date),
      amount: row.Amount || row.Amou || 0,
      description: row.Description || '',
      remarks: row['Remarks/ Reference etc.'] || row['Remarks'] || '',
      category: row.Category || 'Other',
      createdAt: new Date().toISOString()
    })).filter(x => x.amount > 0);
  }

  // Assuming 'Expanse' sheet
  if (workbook.Sheets['Expanse']) {
    const expenseData = xlsx.utils.sheet_to_json(workbook.Sheets['Expanse'], { raw: false, dateNF: 'yyyy-mm-dd' });
    seedData.expenses = expenseData.map((row, i) => ({
      id: `seed_e_${i}`,
      type: 'debit',
      date: safeDate(row.Date),
      amount: row.Amount || row.Amou || 0,

      description: row.Description || '',
      projectId: row['Project Detail or Remarks'] || '',
      category: row.Category || 'Other',
      operatorName: 'Imported',
      createdAt: new Date().toISOString()
    })).filter(x => x.amount > 0);
  }
} else {
  console.log("Cash file not found!");
}

// 2. Process Machine File
if (fs.existsSync(machineFile)) {
  const workbook = xlsx.readFile(machineFile);
  const sheetName = workbook.SheetNames[0]; // Assuming first sheet
  const machineData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, dateNF: 'yyyy-mm-dd' });
  
  seedData.machine_logs = machineData.map((row, i) => ({
    id: `seed_m_${i}`,
    date: safeDate(row.Date),
    operatorId: 'Imported',
    operatorName: row.Operator || 'Imported Log',
    machineId: row.Machine || 'VMC-01',
    projectId: row.Project || 'P-1',
    netHours: row.Hours || row['Net Hours'] || 0,
    outputQuantity: row.Output || 0,
    notes: row.Notes || row.Remarks || '',
    createdAt: new Date().toISOString()
  })).filter(x => x.netHours > 0);
} else {
  console.log("Machine file not found!");
}

fs.mkdirSync(path.join(__dirname, '../src/data'), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(seedData, null, 2));
console.log(`Successfully imported data into ${outFile}`);
