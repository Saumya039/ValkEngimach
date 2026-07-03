import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

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
  return data ? data.map(m => ({ ...m, lastMaintenance: m.lastmaintenance, nextMaintenance: m.nextmaintenance, pendingReview: m.pendingreview })) : [];
};
export const addMachine = async (name) => {
  const today = new Date().toISOString();
  const newMachine = { id: Date.now().toString(), name, lastmaintenance: today, nextmaintenance: today, pendingreview: false };
  const { data, error } = await supabase.from('machines').insert(newMachine).select().single();
  if (error) throw error;
  return data ? { ...data, lastMaintenance: data.lastmaintenance, nextMaintenance: data.nextmaintenance, pendingReview: data.pendingreview } : { ...newMachine, lastMaintenance: newMachine.lastmaintenance, nextMaintenance: newMachine.nextmaintenance, pendingReview: newMachine.pendingreview };
};
export const updateMachineName = async (id, newName) => {
  const { error } = await supabase.from('machines').update({ name: newName }).eq('id', id);
  if (error) throw error;
};
export const updateMachineMaintenance = async (id, nextDate) => {
  const { error } = await supabase.from('machines').update({ 
    lastmaintenance: new Date().toISOString(), 
    nextmaintenance: new Date(nextDate).toISOString(), 
    pendingreview: false 
  }).eq('id', id);
  if (error) throw error;
};
export const reportMaintenanceDone = async (id) => {
  const { error } = await supabase.from('machines').update({ 
    pendingreview: true, 
    reportedat: new Date().toISOString() 
  }).eq('id', id);
  if (error) throw error;
};

// Machine Logs
const mapMachineLogFromDB = (d) => ({
  ...d,
  endDate: d.enddate,
  operatorId: d.operatorname,
  operatorName: d.operatorname,
  operatorNames: d.operatornames,
  machineId: d.machineid,
  projectId: d.projectid,
  activityType: d.activitytype,
  startTime: d.starttime,
  endTime: d.endtime,
  netHours: d.nethours,
  createdAt: d.createdat
});

const mapMachineLogToDB = (d) => {
  const payload = {
    id: d.id,
    date: d.date,
    enddate: d.endDate,
    operatorname: d.operatorId || d.operatorName,
    operatornames: d.operatorNames,
    machineid: d.machineId,
    projectid: d.projectId,
    activitytype: d.activityType,
    starttime: d.startTime,
    endtime: d.endTime,
    nethours: d.netHours,
    notes: d.notes,
    photo: d.photo
  };
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
  return payload;
};

export const addMachineLog = async (logData) => {
  const newLog = mapMachineLogToDB({ ...logData, id: Date.now().toString() });
  const { data, error } = await supabase.from('machine_logs').insert(newLog).select().single();
  if (error) throw error;
  return data ? mapMachineLogFromDB(data) : mapMachineLogFromDB(newLog);
};
export const updateMachineLog = async (id, updatedData) => {
  const payload = mapMachineLogToDB({ ...updatedData, id });
  delete payload.id;
  const { error } = await supabase.from('machine_logs').update(payload).eq('id', id);
  if (error) throw error;
};
export const deleteMachineLog = async (id) => {
  const { error } = await supabase.from('machine_logs').delete().eq('id', id);
  if (error) throw error;
};
export const getMachineLogs = async () => {
  const { data } = await supabase.from('machine_logs').select('*').order('createdat', { ascending: false });
  return data ? data.map(mapMachineLogFromDB) : [];
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
const mapExpenseFromDB = (d) => ({
  ...d,
  projectId: d.projectid,
  operatorId: d.operatorid,
  operatorName: d.operatorname
});
const mapExpenseToDB = (d) => {
  const payload = {
    id: d.id,
    date: d.date,
    amount: d.amount,
    description: d.description,
    category: d.category,
    projectid: d.projectId,
    operatorid: d.operatorId,
    operatorname: d.operatorName
  };
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
  return payload;
};

export const addExpense = async (data) => {
  const entry = mapExpenseToDB({ ...data, id: Date.now().toString() });
  const { data: ret, error } = await supabase.from('expenses').insert(entry).select().single();
  if (error) throw error;
  return ret ? mapExpenseFromDB(ret) : mapExpenseFromDB(entry);
};
export const updateExpense = async (id, updatedData) => {
  const payload = mapExpenseToDB({ ...updatedData, id });
  delete payload.id;
  const { error } = await supabase.from('expenses').update(payload).eq('id', id);
  if (error) throw error;
};
export const deleteExpense = async (id) => {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
};
export const getExpenses = async () => {
  const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false });
  return data ? data.map(mapExpenseFromDB) : [];
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
  return data ? data.map(d => ({ ...d, machineId: d.machineid, projectId: d.projectid })) : [];
};
export const addForecast = async (forecastData) => {
  const newForecast = { 
    machineid: forecastData.machineId, 
    projectid: forecastData.projectId, 
    month: forecastData.month, 
    hours: forecastData.hours, 
    id: Date.now().toString() 
  };
  const { data } = await supabase.from('forecasts').insert(newForecast).select().single();
  return data ? { ...data, machineId: data.machineid, projectId: data.projectid } : { ...newForecast, machineId: newForecast.machineid, projectId: newForecast.projectid };
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
