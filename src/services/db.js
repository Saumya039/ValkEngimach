import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials missing! Check your .env file.");
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

// --- AUTHENTICATION ---
export const authenticateWorker = async (workerId, pin) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', workerId)
    .eq('pin', pin)
    .single();
    
  if (error || !data) throw new Error("Invalid Worker ID or PIN");
  return data;
};

// --- DATA ACCESS ---

// Projects
export const getProjects = async () => {
  const { data } = await supabase.from('projects').select('*');
  return data || [];
};
export const addProject = async (name) => {
  const newProj = { id: Math.floor(1000 + Math.random() * 9000).toString(), name };
  const { data } = await supabase.from('projects').insert(newProj).select().single();
  return data || newProj;
};
export const deleteProject = async (id) => {
  await supabase.from('projects').delete().eq('id', id);
};
export const updateProject = async (id, newName) => {
  await supabase.from('projects').update({ name: newName }).eq('id', id);
};

// Machines
export const getMachines = async () => {
  const { data } = await supabase.from('machines').select('*');
  return data || [];
};
export const addMachine = async (name) => {
  const today = new Date().toISOString();
  const newMachine = { id: Date.now().toString(), name, lastMaintenance: today, nextMaintenance: today, pendingReview: false };
  const { data } = await supabase.from('machines').insert(newMachine).select().single();
  return data || newMachine;
};
export const updateMachineName = async (id, newName) => {
  await supabase.from('machines').update({ name: newName }).eq('id', id);
};
export const updateMachineMaintenance = async (id, nextDate) => {
  await supabase.from('machines').update({ 
    lastMaintenance: new Date().toISOString(), 
    nextMaintenance: new Date(nextDate).toISOString(), 
    pendingReview: false 
  }).eq('id', id);
};
export const reportMaintenanceDone = async (id) => {
  await supabase.from('machines').update({ 
    pendingReview: true, 
    reportedAt: new Date().toISOString() 
  }).eq('id', id);
};

// Machine Logs
export const addMachineLog = async (logData) => {
  const newLog = { ...logData, id: Date.now().toString() };
  const { data } = await supabase.from('machine_logs').insert(newLog).select().single();
  return data || newLog;
};
export const updateMachineLog = async (id, updatedData) => {
  await supabase.from('machine_logs').update(updatedData).eq('id', id);
};
export const deleteMachineLog = async (id) => {
  await supabase.from('machine_logs').delete().eq('id', id);
};
export const getMachineLogs = async () => {
  const { data } = await supabase.from('machine_logs').select('*').order('createdAt', { ascending: false });
  return data || [];
};

// Operator Names
export const getOperatorNames = async () => {
  const { data } = await supabase.from('operator_names').select('name');
  return data ? data.map(d => d.name) : [];
};
export const addOperatorName = async (name) => {
  await supabase.from('operator_names').insert({ name });
  return await getOperatorNames();
};
export const updateOperatorName = async (oldName, newName) => {
  await supabase.from('operator_names').update({ name: newName }).eq('name', oldName);
};
export const removeOperatorName = async (name) => {
  await supabase.from('operator_names').delete().eq('name', name);
  return await getOperatorNames();
};

// Activity Types
export const getActivityTypes = async () => {
  const { data } = await supabase.from('activity_types').select('name');
  return data ? data.map(d => d.name) : [];
};
export const addActivityType = async (name) => {
  await supabase.from('activity_types').insert({ name });
  return await getActivityTypes();
};
export const updateActivityType = async (oldName, newName) => {
  await supabase.from('activity_types').update({ name: newName }).eq('name', oldName);
};
export const removeActivityType = async (name) => {
  await supabase.from('activity_types').delete().eq('name', name);
  return await getActivityTypes();
};

// Cash In
export const addCashIn = async (data) => {
  const entry = { ...data, id: Date.now().toString(), type: 'credit' };
  const { data: ret } = await supabase.from('cash_in').insert(entry).select().single();
  return ret || entry;
};
export const updateCashIn = async (id, updatedData) => {
  await supabase.from('cash_in').update(updatedData).eq('id', id);
};
export const getCashIn = async () => {
  const { data } = await supabase.from('cash_in').select('*').order('date', { ascending: false });
  return data || [];
};

// Expenses
export const addExpense = async (data) => {
  const entry = { ...data, id: Date.now().toString() };
  const { data: ret } = await supabase.from('expenses').insert(entry).select().single();
  return ret || entry;
};
export const updateExpense = async (id, updatedData) => {
  await supabase.from('expenses').update(updatedData).eq('id', id);
};
export const deleteExpense = async (id) => {
  await supabase.from('expenses').delete().eq('id', id);
};
export const getExpenses = async () => {
  const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false });
  return data || [];
};

// Financial Summary
export const getFinancialSummary = async () => {
  const cashIn = await getCashIn();
  const expenses = await getExpenses();
  
  const totalCashIn = cashIn.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = totalCashIn - totalExpense;

  const expensesByCategory = expenses.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + Number(item.amount);
    return acc;
  }, {});

  return { totalCashIn, totalExpense, balance, expensesByCategory };
};

// LocalStorage used for alert threshold (per-browser pref)
export const getCashAlertThreshold = async () => {
  const val = localStorage.getItem('valk_cash_alert_threshold');
  return val ? parseInt(val, 10) : 50000;
};

export const setCashAlertThreshold = async (val) => {
  localStorage.setItem('valk_cash_alert_threshold', val.toString());
};

// Forecasts
export const getForecasts = async () => {
  const { data } = await supabase.from('forecasts').select('*');
  return data || [];
};
export const addForecast = async (forecastData) => {
  const newForecast = { ...forecastData, id: Date.now().toString() };
  const { data } = await supabase.from('forecasts').insert(newForecast).select().single();
  return data || newForecast;
};
export const deleteForecast = async (id) => {
  await supabase.from('forecasts').delete().eq('id', id);
};

// AI Category
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
