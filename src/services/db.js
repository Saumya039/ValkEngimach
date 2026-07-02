// Valk Engimach Database Service v2.0
// Uses LocalStorage for prototype. Can swap to Firebase later.

const delay = (ms = 300) => new Promise(res => setTimeout(res, ms));

const getTable = (tableName) => {
  const data = localStorage.getItem(`valk_${tableName}`);
  return data ? JSON.parse(data) : null;
};

const setTable = (tableName, data) => {
  localStorage.setItem(`valk_${tableName}`, JSON.stringify(data));
};

import seedData from '../data/seedData.json';

// --- INITIALIZATION ---
export const initializeDB = () => {
  // Always initialize users to ensure v2.0 numeric logins are present
  setTable('users', [
    { id: '1000', pin: '1234', role: 'admin', name: 'Admin' },
    { id: '2001', pin: '1111', role: 'operator', name: 'Operator' }
  ]);

  if (!getTable('projects')) {
    setTable('projects', [
      { id: 'P-1', name: 'Ply Cutter - CT' },
      { id: 'P-2', name: 'Siddharth' },
      { id: 'P-3', name: 'Factory Floor Maintenance' }
    ]);
  }
  if (!getTable('machines')) {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(today.getMonth() + 1);
    setTable('machines', [
      { id: 'VMC-01', name: 'VMC 01', lastMaintenance: today.toISOString(), nextMaintenance: nextMonth.toISOString() },
      { id: 'CNC-02', name: 'Router 1', lastMaintenance: today.toISOString(), nextMaintenance: nextMonth.toISOString() },
      { id: 'LAS-03', name: 'Router 2', lastMaintenance: today.toISOString(), nextMaintenance: nextMonth.toISOString() }
    ]);
  }
  
  if (!getTable('machine_logs') || getTable('machine_logs').length === 0) {
    setTable('machine_logs', seedData.machine_logs || []);
  }
  if (!getTable('cash_in') || getTable('cash_in').length === 0) {
    setTable('cash_in', seedData.cash_in || []);
  }
  if (!getTable('expenses') || getTable('expenses').length === 0) {
    setTable('expenses', seedData.expenses || []);
  }
  if (!getTable('operator_names')) {
    setTable('operator_names', ['Sapan Desai', 'Ramesh Patel']);
  }
};

// Call immediately
initializeDB();

// --- AUTHENTICATION ---
export const authenticateWorker = async (workerId, pin) => {
  await delay();
  const users = getTable('users');
  const user = users.find(u => u.id === workerId && u.pin === pin);
  if (!user) throw new Error("Invalid Worker ID or PIN");
  return user;
};

// --- DATA ACCESS ---

// Projects
export const getProjects = async () => {
  await delay(100);
  return getTable('projects');
};
export const addProject = async (name) => {
  await delay();
  const projects = getTable('projects');
  const newProj = { id: Math.floor(1000 + Math.random() * 9000).toString(), name };
  projects.push(newProj);
  setTable('projects', projects);
  return newProj;
};

// Machines
export const getMachines = async () => {
  await delay(100);
  return getTable('machines') || [];
};

export const updateMachineMaintenance = async (id, nextDate) => {
  await delay(200);
  const machines = getTable('machines');
  const index = machines.findIndex(m => m.id === id);
  if (index > -1) {
    machines[index].lastMaintenance = new Date().toISOString();
    machines[index].nextMaintenance = new Date(nextDate).toISOString();
    machines[index].pendingReview = false; // admin has now actioned it
    setTable('machines', machines);
  }
};

// Operator reports maintenance as physically done. This does NOT change the
// official last/next maintenance dates (those stay admin-only) — it just
// raises a flag so the admin knows to come update the schedule.
export const reportMaintenanceDone = async (id) => {
  await delay(150);
  const machines = getTable('machines');
  const index = machines.findIndex(m => m.id === id);
  if (index > -1) {
    machines[index].pendingReview = true;
    machines[index].reportedAt = new Date().toISOString();
    setTable('machines', machines);
  }
};


// Machine Logs (Operator)
export const addMachineLog = async (logData) => {
  await delay();
  const logs = getTable('machine_logs');
  const newLog = { ...logData, id: Date.now().toString(), createdAt: new Date().toISOString() };
  logs.push(newLog);
  setTable('machine_logs', logs);
  return newLog;
};

export const getMachineLogs = async () => {
  await delay(100);
  const logs = getTable('machine_logs') || [];
  return logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// Operator Names (Admin-managed dropdown; no per-operator login accounts)
export const getOperatorNames = async () => {
  await delay(100);
  return getTable('operator_names') || [];
};
export const addOperatorName = async (name) => {
  await delay();
  const names = getTable('operator_names') || [];
  if (!names.includes(name)) {
    names.push(name);
    setTable('operator_names', names);
  }
  return names;
};
export const removeOperatorName = async (name) => {
  await delay();
  const names = (getTable('operator_names') || []).filter(n => n !== name);
  setTable('operator_names', names);
  return names;
};

// --- CASH SYSTEM ---

// Cash In (Admin Only)
export const addCashIn = async (data) => {
  await delay();
  const cashIn = getTable('cash_in');
  const entry = { ...data, id: Date.now().toString(), type: 'credit', createdAt: new Date().toISOString() };
  cashIn.push(entry);
  setTable('cash_in', cashIn);
  return entry;
};
export const getCashIn = async () => {
  await delay(100);
  return getTable('cash_in').sort((a, b) => new Date(b.date) - new Date(a.date));
};

// Expenses (Admin + Operator)
export const addExpense = async (data) => {
  await delay();
  const expenses = getTable('expenses');
  const entry = { ...data, id: Date.now().toString(), type: 'debit', createdAt: new Date().toISOString() };
  expenses.push(entry);
  setTable('expenses', expenses);
  return entry;
};
export const getExpenses = async () => {
  await delay(100);
  return getTable('expenses').sort((a, b) => new Date(b.date) - new Date(a.date));
};

// Financial Reporting
export const getFinancialSummary = async () => {
  await delay(100);
  const cashIn = getTable('cash_in') || [];
  const expenses = getTable('expenses') || [];
  
  const totalCashIn = cashIn.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = totalCashIn - totalExpense;

  // Group expenses by category
  const expensesByCategory = expenses.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + Number(item.amount);
    return acc;
  }, {});

  return { totalCashIn, totalExpense, balance, expensesByCategory };
};

// Low cash-balance alert threshold (admin-configurable)
export const getCashAlertThreshold = () => {
  const val = localStorage.getItem('valk_cash_alert_threshold');
  return val !== null ? Number(val) : 20000;
};
export const setCashAlertThreshold = (value) => {
  localStorage.setItem('valk_cash_alert_threshold', String(value));
};

// --- AI EXPENSE CATEGORIZATION ---
export const suggestExpenseCategory = (description) => {
  if (!description) return "Not clear";
  const desc = description.toLowerCase();
  
  const keywordMap = {
    "Meal and Tea etc": ["tea", "lunch", "nasto", "nashto", "food", "water", "padaki", "biscuit", "meal", "coffee", "snack", "dinner", "breakfast", "milk"],
    "Tools and Hardware": ["bolt", "hex", "hardware", "drill", "bit", "nut", "screw", "bearing", "cutter", "tool", "spanner", "wrench", "blade", "insert", "allen", "key", "tap", "die", "chuck", "collet", "grinding", "wheel", "fastener", "washer", "rivet"],
    "Advance Salary": ["salary", "wage", "advance", "pay", "bonus", "overtime", "ot"],
    "Job work": ["cutting", "fitting", "job", "jobwork", "work", "turning", "milling", "cnc", "vmc", "programming", "drawing", "design", "laser", "bending", "fabrication", "welding job"],
    "Transportation": ["courier", "hydra", "tempo", "transport", "freight", "truck", "rickshaw", "auto", "bus", "travel", "shipping", "delivery", "postage", "lorry", "crane", "forklift"],
    "Travel Allowance": ["petrol", "patrol", "diesel", "allowance", "toll", "gas", "fuel", "cng", "parking", "ticket"],
    "Maintenance": ["maintenance", "repair", "service", "ac fitting", "cooling", "fan", "fixing", "install", "plumbing", "electric", "wiring", "bulb", "tube", "light", "motor", "pump", "belt", "pulley"],
    "Asset": ["asset", "machine", "laptop", "mouse", "cover", "table", "chair", "computer", "printer", "monitor", "keyboard", "desk", "cabinet", "shelf", "rack"],
    "Production Consumable": ["putty", "welding", "argon", "rod", "emery", "sand", "oil", "coolant", "lubricant", "grease", "cotton", "waste", "rag", "thinner", "paint", "primer", "gas", "oxygen", "co2"],
    "Raw Material": ["plate", "ms plate", "sheet", "aluminium", "ss", "mild steel", "stainless", "brass", "copper", "bar", "rod", "pipe", "tube", "angle", "channel", "beam", "flat", "acrylic", "mdf", "ply", "wood", "plastic", "nylon", "teflon"],
    "Non Production Consumable": ["mask", "paper", "battery", "fevikwik", "tape", "glue", "adhesive", "marker", "pen", "pencil", "stationery", "stapler", "pin", "clip", "file", "folder", "book", "register", "soap", "handwash", "cleaning", "broom", "mop", "acid", "phenyl"]
  };

  for (const [category, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(kw => desc.includes(kw))) {
      return category;
    }
  }
  
  return "Not clear";
};
