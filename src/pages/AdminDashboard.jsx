import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getFinancialSummary, getProjects, addProject, deleteProject, updateProject, getMachines, addMachine, updateMachineName, updateMachineMaintenance, getMachineLogs, updateMachineLog, getExpenses, getCashIn, getOperatorNames, addOperatorName, removeOperatorName, updateOperatorName, getActivityTypes, addActivityType, removeActivityType, updateActivityType, getCashAlertThreshold, setCashAlertThreshold, addForecast, getForecasts, deleteForecast } from '../services/db';
import { Activity, Wrench, FolderOpen, Calendar, ArrowLeft, Download, FileText, Users, X, AlertTriangle, Camera, Gauge, Trash2, Edit2, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { exportToCsv } from '../utils/exportCsv';
import { exportToPdf } from '../utils/exportPdf';
import { formatDate, isWithinRange } from '../utils/dateFormat';
import Modal from '../components/Modal';
import DateRangeFilter from '../components/DateRangeFilter';

const COLORS = ['#0b7a69', '#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#eab308', '#ec4899', '#14b8a6'];
const WORK_HOURS_PER_DAY = 8;

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('reports');
  const [finances, setFinances] = useState({ totalCashIn: 0, totalExpense: 0, balance: 0, expensesByCategory: {} });
  const [projects, setProjects] = useState([]);
  const [machines, setMachines] = useState([]);
  const [machineLogs, setMachineLogs] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [cashInLogs, setCashInLogs] = useState([]);
  const [forecasts, setForecasts] = useState([]);

  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [editingOperatorNameOld, setEditingOperatorNameOld] = useState(null);
  const [editingOperatorNameNew, setEditingOperatorNameNew] = useState('');
  const [editingMachine, setEditingMachine] = useState(null);
  const [newMaintenanceDate, setNewMaintenanceDate] = useState('');

  const [selectedProject, setSelectedProject] = useState(null);
  const [maintenanceTypes, setMaintenanceTypes] = useState(
    JSON.parse(localStorage.getItem('valk_maint_types')) || ['Oil Change', 'Cleaning', 'Part Replacement']
  );
  const [newMaintType, setNewMaintType] = useState('');
  const [operatorNames, setOperatorNames] = useState([]);
  const [newOperatorName, setNewOperatorName] = useState('');
  const [newMachineName, setNewMachineName] = useState('');
  const [editingMachineNameId, setEditingMachineNameId] = useState(null);
  const [editingMachineNameValue, setEditingMachineNameValue] = useState('');
  const [activityTypesList, setActivityTypesList] = useState([]);
  const [newActivityType, setNewActivityType] = useState('');
  const [editingActivityTypeOld, setEditingActivityTypeOld] = useState(null);
  const [editingActivityTypeNew, setEditingActivityTypeNew] = useState('');

  // Cash alert
  const [cashAlertThreshold, setCashAlertThresholdState] = useState(getCashAlertThreshold());
  const [editingThreshold, setEditingThreshold] = useState(false);
  const [thresholdInput, setThresholdInput] = useState(cashAlertThreshold);

  // Chart pivot + drill-down
  const [chartView, setChartView] = useState('monthly'); // monthly | yearly | highest
  const [drillDownPeriod, setDrillDownPeriod] = useState(null);

  // Ledger date filters
  const [expenseDateFrom, setExpenseDateFrom] = useState('');
  const [expenseDateTo, setExpenseDateTo] = useState('');
  const [machineLogDateFrom, setMachineLogDateFrom] = useState('');
  const [machineLogDateTo, setMachineLogDateTo] = useState('');
  
  // New Filters for Synthesis - M/C
  const [filterMachineId, setFilterMachineId] = useState('');
  const [filterProjectId, setFilterProjectId] = useState('');
  const [utilizationMonth, setUtilizationMonth] = useState(new Date().toISOString().substring(0, 7));

  const [viewingPhoto, setViewingPhoto] = useState(null);

  // Forecast state
  const [newForecastMachineId, setNewForecastMachineId] = useState('');
  const [newForecastProjectId, setNewForecastProjectId] = useState('');
  const [newForecastMonth, setNewForecastMonth] = useState(new Date().toISOString().substring(0, 7));
  const [newForecastHours, setNewForecastHours] = useState('');

  // Editing Machine Log
  const [editingMachineLog, setEditingMachineLog] = useState(null);
  const [editLogData, setEditLogData] = useState({});

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    const data = await getFinancialSummary();
    setFinances(data);
    const p = await getProjects();
    setProjects(p);
    const m = await getMachines();
    setMachines(m);
    const logs = await getMachineLogs();
    setMachineLogs(logs);
    const exps = await getExpenses();
    setAllExpenses(exps);
    const cash = await getCashIn();
    setCashInLogs(cash);
    const ops = await getOperatorNames();
    setOperatorNames(ops);
    const acts = await getActivityTypes();
    setActivityTypesList(acts);
    const fcsts = await getForecasts();
    setForecasts(fcsts);
  }

  const handleAddOperator = async (e) => {
    e.preventDefault();
    if (!newOperatorName.trim()) return;
    await addOperatorName(newOperatorName.trim());
    setNewOperatorName('');
    fetchData();
  };

  const handleRemoveOperator = async (name) => {
    await removeOperatorName(name);
    fetchData();
  };

  const handleEditOperatorSubmit = async (e, oldName) => {
    e.preventDefault();
    if (!editingOperatorNameNew.trim()) return;
    await updateOperatorName(oldName, editingOperatorNameNew.trim());
    setEditingOperatorNameOld(null);
    fetchData();
  };

  const handleAddMachine = async (e) => {
    e.preventDefault();
    if (!newMachineName.trim()) return;
    await addMachine(newMachineName.trim());
    setNewMachineName('');
    fetchData();
  };

  const handleEditMachineNameSubmit = async (e, id) => {
    e.preventDefault();
    if (!editingMachineNameValue.trim()) return;
    await updateMachineName(id, editingMachineNameValue.trim());
    setEditingMachineNameId(null);
    fetchData();
  };

  const handleAddActivityType = async (e) => {
    e.preventDefault();
    if (!newActivityType.trim()) return;
    await addActivityType(newActivityType.trim());
    setNewActivityType('');
    fetchData();
  };

  const handleRemoveActivityType = async (name) => {
    await removeActivityType(name);
    fetchData();
  };

  const handleEditActivityTypeSubmit = async (e, oldName) => {
    e.preventDefault();
    if (!editingActivityTypeNew.trim()) return;
    await updateActivityType(oldName, editingActivityTypeNew.trim());
    setEditingActivityTypeOld(null);
    fetchData();
  };

  const handleUpdateMachineLog = async (e) => {
    e.preventDefault();
    await updateMachineLog(editingMachineLog.id, editLogData);
    setEditingMachineLog(null);
    fetchData();
  };

  const handleAddForecast = async (e) => {
    e.preventDefault();
    if (!newForecastMachineId || !newForecastProjectId || !newForecastMonth || !newForecastHours) return;
    await addForecast({ machineId: newForecastMachineId, projectId: newForecastProjectId, month: newForecastMonth, hours: Number(newForecastHours) });
    setNewForecastMachineId('');
    setNewForecastProjectId('');
    setNewForecastHours('');
    const fcsts = await getForecasts();
    setForecasts(fcsts);
  };
  
  const handleDeleteForecast = async (id) => {
    await deleteForecast(id);
    const fcsts = await getForecasts();
    setForecasts(fcsts);
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    await addProject(newProjectName.trim());
    setNewProjectName('');
    const updated = await getProjects();
    setProjects(updated);
  };

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation(); // prevent card click
    if (window.confirm('Are you sure you want to delete this project?')) {
      await deleteProject(id);
      const updated = await getProjects();
      setProjects(updated);
    }
  };

  const handleEditProjectSubmit = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editingProjectName.trim()) return;
    await updateProject(id, editingProjectName.trim());
    setEditingProjectId(null);
    const updated = await getProjects();
    setProjects(updated);
  };

  const handleUpdateMaintenance = async (e) => {
    e.preventDefault();
    if (!editingMachine || !newMaintenanceDate) return;
    await updateMachineMaintenance(editingMachine, newMaintenanceDate);
    setEditingMachine(null);
    setNewMaintenanceDate('');
    fetchData();
  };

  const handleAddMaintType = (e) => {
    e.preventDefault();
    if(newMaintType && !maintenanceTypes.includes(newMaintType)) {
      const updated = [...maintenanceTypes, newMaintType];
      setMaintenanceTypes(updated);
      localStorage.setItem('valk_maint_types', JSON.stringify(updated));
      setNewMaintType('');
    }
  };

  const handleSaveThreshold = () => {
    const val = Number(thresholdInput) || 0;
    setCashAlertThreshold(val);
    setCashAlertThresholdState(val);
    setEditingThreshold(false);
  };

  const parseHours = (timeStr) => {
    if(!timeStr) return 0;
    const parts = String(timeStr).split(':');
    if(parts.length === 3) return parseInt(parts[0]) + parseInt(parts[1])/60 + parseInt(parts[2])/3600;
    return Number(timeStr) || 0;
  };

  const formatHours = (decimalHours) => {
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
  };

  const operatorDisplay = (log) => Array.isArray(log.operatorNames) ? log.operatorNames.join(', ') : (log.operatorName || 'N/A');

  // Data processing for charts
  const pieData = Object.entries(finances.expensesByCategory).map(([name, value]) => ({ name, value }));

  const monthDataObj = allExpenses.reduce((acc, exp) => {
    const month = new Date(exp.date).toLocaleString('default', { month: 'short', year: '2-digit' });
    acc[month] = (acc[month] || 0) + Number(exp.amount);
    return acc;
  }, {});
  const monthChartData = Object.entries(monthDataObj).map(([name, value]) => ({ name, value })).reverse(); // oldest first if date sorted descending initially

  const yearDataObj = allExpenses.reduce((acc, exp) => {
    const year = new Date(exp.date).getFullYear();
    acc[year] = (acc[year] || 0) + Number(exp.amount);
    return acc;
  }, {});
  const yearChartData = Object.entries(yearDataObj).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));

  const activeChartData = chartView === 'yearly' ? yearChartData
    : chartView === 'highest' ? [...monthChartData].sort((a, b) => b.value - a.value)
    : monthChartData;

  const allTransactions = [...cashInLogs, ...allExpenses];
  const drillDownTransactions = drillDownPeriod ? allTransactions.filter(t => {
    const d = new Date(t.date);
    const key = drillDownPeriod.mode === 'yearly' ? String(d.getFullYear()) : d.toLocaleString('default', { month: 'short', year: '2-digit' });
    return key === drillDownPeriod.label;
  }).sort((a, b) => new Date(b.date) - new Date(a.date)) : [];

  const machineSummary = {};
  machineLogs.forEach(log => {
    if (machineLogDateFrom && !isWithinRange(log.date, machineLogDateFrom, machineLogDateTo)) return;
    if (filterMachineId && log.machineId !== filterMachineId) return;
    if (filterProjectId && log.projectId !== filterProjectId) return;
    
    const m = machines.find(mac => mac.id === log.machineId);
    const mName = m ? m.name : log.machineId;
    const p = projects.find(proj => proj.id === log.projectId);
    const pName = p ? p.name : log.projectId;

    if(!machineSummary[mName]) machineSummary[mName] = {};
    if(!machineSummary[mName][pName]) machineSummary[mName][pName] = 0;
    machineSummary[mName][pName] += parseHours(log.netHours);
  });

  // Date-wise summary: total hours per activity type per day, plus grand total
  const activityTypesSeen = [...new Set(machineLogs.map(l => l.activityType).filter(Boolean))].sort();
  const dailySummaryObj = machineLogs.reduce((acc, log) => {
    const startDateStr = log.date;
    const endDateStr = log.endDate || log.date;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    
    // calculate total days inclusive
    const daysDiff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const hrs = parseHours(log.netHours);
    const hrsPerDay = hrs / daysDiff;

    for (let i = 0; i < daysDiff; i++) {
      const current = new Date(start);
      current.setDate(current.getDate() + i);
      const day = current.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const isoDate = current.toISOString().split('T')[0];
      if (!acc[day]) acc[day] = { date: isoDate, byType: {}, total: 0 };
      acc[day].byType[log.activityType] = (acc[day].byType[log.activityType] || 0) + hrsPerDay;
      acc[day].total += hrsPerDay;
    }
    return acc;
  }, {});
  const dailySummaryRows = Object.entries(dailySummaryObj)
    .sort((a, b) => new Date(b[1].date) - new Date(a[1].date));
  const grandTotalsByType = activityTypesSeen.reduce((acc, t) => {
    acc[t] = machineLogs.filter(l => l.activityType === t).reduce((s, l) => s + parseHours(l.netHours), 0);
    return acc;
  }, {});
  const grandTotalHours = Object.values(grandTotalsByType).reduce((s, v) => s + v, 0);

  // Utilization data (Bar Chart)
  const [utilYear, utilMonth] = utilizationMonth.split('-');
  const daysInMonth = new Date(Number(utilYear), Number(utilMonth), 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === Number(utilYear) && today.getMonth() + 1 === Number(utilMonth);
  const elapsedDays = isCurrentMonth ? today.getDate() : daysInMonth;
  const availableHoursMonth = elapsedDays * WORK_HOURS_PER_DAY;
  
  const utilizationChartData = machines.map(m => {
    const hours = machineLogs
      .filter(l => l.machineId === m.id && l.date.startsWith(utilizationMonth))
      .reduce((s, l) => s + parseHours(l.netHours), 0);
    return { name: m.name, hours: Number(hours.toFixed(1)) };
  });

  // Filtered ledger rows
  const visibleMachineLogs = machineLogs.filter(l => {
    if (machineLogDateFrom && !isWithinRange(l.date, machineLogDateFrom, machineLogDateTo)) return false;
    if (filterMachineId && l.machineId !== filterMachineId) return false;
    if (filterProjectId && l.projectId !== filterProjectId) return false;
    return true;
  });
  const visibleExpenses = (expenseDateFrom || expenseDateTo) ? allExpenses.filter(e => isWithinRange(e.date, expenseDateFrom, expenseDateTo)) : allExpenses;

  // Forecast data for chart
  const forecastChartData = machines.map(m => {
    // Actuals
    const actuals = visibleMachineLogs
      .filter(l => l.machineId === m.id)
      .reduce((s, l) => s + parseHours(l.netHours), 0);
      
    // Forecasts
    const fcasts = forecasts
      .filter(f => f.machineId === m.id && f.month === utilizationMonth)
      .reduce((s, f) => s + f.hours, 0);

    return { name: m.name, actual: Number(actuals.toFixed(1)), forecast: Number(fcasts.toFixed(1)) };
  });

  const handleExportMachineLogs = () => {
    exportToCsv('machine_activity_log.csv', visibleMachineLogs.map(l => ({
      date: formatDate(l.date), operator: operatorDisplay(l), activityType: l.activityType,
      machine: machines.find(m => m.id === l.machineId)?.name || l.machineId,
      project: projects.find(p => p.id === l.projectId)?.name || l.projectId,
      hours: l.netHours, notes: l.notes || ''
    })));
  };

  const handleExportMachineLogsPdf = () => {
    exportToPdf('machine_activity_log.pdf', 'Machine Log', ['Date', 'Operator', 'Activity', 'Machine', 'Project', 'Duration'],
      visibleMachineLogs.map(l => [formatDate(l.date), operatorDisplay(l), l.activityType || 'N/A',
        machines.find(m => m.id === l.machineId)?.name || l.machineId,
        projects.find(p => p.id === l.projectId)?.name || l.projectId, l.netHours]));
  };

  const handleExportExpenses = () => {
    exportToCsv('expense_ledger.csv', visibleExpenses.map(e => ({
      date: formatDate(e.date), description: e.description, category: e.category,
      project: projects.find(p => p.id === e.projectId)?.name || '', amount: e.amount, operator: e.operatorName || ''
    })));
  };

  const handleExportExpensesPdf = () => {
    exportToPdf('expense_ledger.pdf', 'Expense Ledger', ['Date', 'Description', 'Category', 'Project', 'Amount'],
      visibleExpenses.map(e => [formatDate(e.date), e.description, e.category, projects.find(p => p.id === e.projectId)?.name || '-', `Rs ${Number(e.amount).toLocaleString()}`]));
  };

  return (
    <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>

      <AnimatePresence>
        {finances.balance < cashAlertThreshold && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card mb-6 border-l-4 border-danger-color">
            <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} color="#f43f5e" />
                <span className="font-bold text-danger-color">Low cash balance:</span>
                <span>current balance ₹{finances.balance.toLocaleString()} is below the ₹{cashAlertThreshold.toLocaleString()} alert threshold.</span>
              </div>
              {editingThreshold ? (
                <div className="flex items-center gap-2">
                  <input type="number" className="input" style={{ width: '140px' }} value={thresholdInput} onChange={(e) => setThresholdInput(e.target.value)} />
                  <button className="btn btn-primary text-sm" onClick={handleSaveThreshold}>Save</button>
                  <button className="btn btn-outline text-sm" onClick={() => setEditingThreshold(false)}>Cancel</button>
                </div>
              ) : (
                <button className="btn btn-outline text-sm" onClick={() => { setThresholdInput(cashAlertThreshold); setEditingThreshold(true); }}>Edit threshold</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap gap-4 mb-8">
        <button className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-outline'}`} onClick={() => {setActiveTab('reports'); setSelectedProject(null);}}>
          <Activity size={16} /> Synthesis - Petty Cash
        </button>
        <button className={`btn ${activeTab === 'ledgers' ? 'btn-primary' : 'btn-outline'}`} onClick={() => {setActiveTab('ledgers'); setSelectedProject(null);}}>
          <FolderOpen size={16} /> Synthesis - Machine Log
        </button>
        <button className={`btn ${activeTab === 'projects' ? 'btn-primary' : 'btn-outline'}`} onClick={() => {setActiveTab('projects'); setSelectedProject(null);}}>
          <Activity size={16} /> Data Entry
        </button>
        <button className={`btn ${activeTab === 'machines' ? 'btn-primary' : 'btn-outline'}`} onClick={() => {setActiveTab('machines'); setSelectedProject(null);}}>
          <Wrench size={16} /> Machine Maintenance
        </button>
        <button className={`btn ${activeTab === 'forecast' ? 'btn-primary' : 'btn-outline'}`} onClick={() => {setActiveTab('forecast'); setSelectedProject(null);}}>
          <TrendingUp size={16} /> Machine Forecast
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'reports' && (
          <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="card text-center" style={{ padding: '2rem 1rem' }}>
                <h3 className="text-muted">Total Cash In</h3>
                <h2 className="text-gradient" style={{ fontSize: '2.5rem' }}>₹{finances.totalCashIn.toLocaleString()}</h2>
              </div>
              <div className="card text-center" style={{ padding: '2rem 1rem' }}>
                <h3 className="text-muted">Total Expense</h3>
                <h2 style={{ fontSize: '2.5rem', color: '#f43f5e' }}>₹{finances.totalExpense.toLocaleString()}</h2>
              </div>
              <div className="card text-center" style={{ padding: '2rem 1rem' }}>
                <h3 className="text-muted">Current Balance</h3>
                <h2 style={{ fontSize: '2.5rem', color: finances.balance >= 0 ? '#10b981' : '#f43f5e' }}>
                  ₹{finances.balance.toLocaleString()}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Category Pie Chart */}
              <div className="card">
                <h3 className="mb-6">Expense Breakdown</h3>
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div style={{ height: 250, flex: 1, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-2 w-full md:w-1/2">
                    {pieData.sort((a, b) => b.value - a.value).map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between text-sm font-mono pb-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-2 text-xs truncate max-w-[140px]" title={entry.name}>
                          <div style={{ minWidth: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }}></div>
                          <span className="truncate">{entry.name}</span>
                        </div>
                        <span className="font-bold text-xs">₹{entry.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Month-wise expenses */}
              <div className="card">
                <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 className="mb-0">{chartView === 'yearly' ? 'Year-wise' : 'Month-wise'} Expenses</h3>
                  <select className="select" style={{ width: 'auto' }} value={chartView} onChange={(e) => setChartView(e.target.value)}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="highest">Highest First</option>
                  </select>
                </div>
                <p className="text-xs text-muted mb-2">Click a bar to see every debit/credit entry for that period.</p>
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activeChartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 12}} />
                      <YAxis tick={{fill: '#94a3b8', fontSize: 12}} width={80} tickFormatter={(val) => `₹${val}`} />
                      <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} formatter={(value) => `₹${value.toLocaleString()}`} />
                      <Bar dataKey="value" fill="var(--cta-color)" radius={[4, 4, 0, 0]} cursor="pointer"
                        onClick={(data) => setDrillDownPeriod({ label: data.name, mode: chartView === 'yearly' ? 'yearly' : 'monthly' })} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Expense Ledger (moved from Synthesis - M/C) */}
            <div className="card">
              <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <h3 className="mb-0">Expense Ledger</h3>
                <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
                  <DateRangeFilter from={expenseDateFrom} to={expenseDateTo} onFromChange={setExpenseDateFrom} onToChange={setExpenseDateTo} />
                  <div className="flex gap-2">
                    <button className="btn btn-outline text-sm" onClick={handleExportExpenses}><Download size={14} /> CSV</button>
                    <button className="btn btn-outline text-sm" onClick={handleExportExpensesPdf}><FileText size={14} /> PDF</button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="sticky top-0 bg-white shadow-sm">
                    <tr>
                      <th className="py-3 px-4 text-muted font-semibold">Date</th>
                      <th className="py-3 px-4 text-muted font-semibold">Description</th>
                      <th className="py-3 px-4 text-muted font-semibold">Category</th>
                      <th className="py-3 px-4 text-muted font-semibold">Project</th>
                      <th className="py-3 px-4 text-muted font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleExpenses.map(exp => (
                      <tr key={exp.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{formatDate(exp.date)}</td>
                        <td className="py-3 px-4">{exp.description}</td>
                        <td className="py-3 px-4"><span className="badge">{exp.category}</span></td>
                        <td className="py-3 px-4 text-muted">{projects.find(p => p.id === exp.projectId)?.name || '-'}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-danger-color">₹{Number(exp.amount).toLocaleString()}</td>
                      </tr>
                    ))}
                    {visibleExpenses.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-muted">No expenses in this range.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'ledgers' && (
          <motion.div key="ledgers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 gap-8">
            
            {/* Filters & Projectwise Summary */}
            <div className="card">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b pb-4">
                <h3 className="mb-0">Projectwise Machine Log</h3>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <select className="select" value={filterMachineId} onChange={(e) => setFilterMachineId(e.target.value)}>
                      <option value="">All Machines</option>
                      {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <select className="select" value={filterProjectId} onChange={(e) => setFilterProjectId(e.target.value)}>
                      <option value="">All Projects</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <DateRangeFilter from={machineLogDateFrom} to={machineLogDateTo} onFromChange={setMachineLogDateFrom} onToChange={setMachineLogDateTo} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(machineSummary).map(([machName, projs]) => (
                  <div key={machName} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                    <h4 className="font-bold text-lg mb-3 pb-2 border-b border-gray-200">{machName}</h4>
                    <div className="flex flex-col gap-2">
                      {Object.entries(projs).map(([projName, decimalHrs]) => (
                        <div key={projName} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">{projName}</span>
                          <span className="font-mono font-bold text-cta-color">{formatHours(decimalHrs)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {Object.keys(machineSummary).length === 0 && <p className="text-muted">No machine logs in this range.</p>}
              </div>
            </div>

            {/* Machine Run Time Log (Raw Entries) */}
            <div className="card">
              <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <h3 className="mb-0">Machine Run Time Log</h3>
                <div className="flex gap-2">
                  <button className="btn btn-outline text-sm" onClick={handleExportMachineLogs}><Download size={14} /> CSV</button>
                  <button className="btn btn-outline text-sm" onClick={handleExportMachineLogsPdf}><FileText size={14} /> PDF</button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="sticky top-0 bg-white shadow-sm">
                    <tr>
                      <th className="py-3 px-4 text-muted font-semibold">Date</th>
                      <th className="py-3 px-4 text-muted font-semibold">Operator</th>
                      <th className="py-3 px-4 text-muted font-semibold">Activity</th>
                      <th className="py-3 px-4 text-muted font-semibold">Machine</th>
                      <th className="py-3 px-4 text-muted font-semibold">Project</th>
                      <th className="py-3 px-4 text-muted font-semibold text-right">Duration</th>
                      <th className="py-3 px-4 text-muted font-semibold text-center">Photo</th>
                      <th className="py-3 px-4 text-muted font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMachineLogs.map(log => {
                      const m = machines.find(mac => mac.id === log.machineId);
                      const p = projects.find(proj => proj.id === log.projectId);
                      return (
                        <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm">{log.endDate && log.endDate !== log.date ? `${formatDate(log.date)} - ${formatDate(log.endDate)}` : formatDate(log.date)}</td>
                          <td className="py-3 px-4 font-medium">{operatorDisplay(log)}</td>
                          <td className="py-3 px-4 text-xs">
                            <span className="bg-gray-100 px-2 py-1 rounded">{log.activityType || 'N/A'}</span>
                          </td>
                          <td className="py-3 px-4">{m ? m.name : log.machineId}</td>
                          <td className="py-3 px-4 text-muted">{p ? p.name : log.projectId}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-cta-color">{log.netHours}</td>
                          <td className="py-3 px-4 text-center">
                            {log.photo ? (
                              <button type="button" className="btn btn-outline" style={{ padding: '0.3rem' }} onClick={() => setViewingPhoto(log.photo)}>
                                <Camera size={14} />
                              </button>
                            ) : <span className="text-muted">-</span>}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button className="text-gray-500 hover:bg-gray-100 p-1 rounded" onClick={() => {
                              setEditingMachineLog(log);
                              setEditLogData({
                                date: log.date,
                                endDate: log.endDate || log.date,
                                operatorName: log.operatorName || (log.operatorIds && log.operatorIds.length > 0 ? log.operatorIds[0] : ''),
                                activityType: log.activityType || '',
                                machineId: log.machineId,
                                projectId: log.projectId,
                                netHours: log.netHours,
                              });
                            }}>
                              <Edit2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {visibleMachineLogs.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-8 text-muted">No machine logs in this range.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Machine Utilization Bar Chart */}
            <div className="card">
              <div className="flex justify-between items-center mb-6 border-b pb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <h3 className="mb-0 flex items-center gap-2"><Gauge size={18} /> Machine Utilization</h3>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <input type="month" className="input" value={utilizationMonth} onChange={(e) => setUtilizationMonth(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted mb-6">Aggregate run time (hours) vs. available shift hours ({WORK_HOURS_PER_DAY}h/day A- {elapsedDays} days elapsed).</p>
              
              <div style={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={utilizationChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 12}} />
                    <YAxis tick={{fill: '#94a3b8', fontSize: 12}} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                    <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} formatter={(val) => `${val} hrs`} />
                    
                    {/* Background bar representing total available capacity */}
                    <Bar dataKey={() => availableHoursMonth} fill="#f1f5f9" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    
                    {/* Actual utilization bar overlapping */}
                    <Bar dataKey="hours" fill="var(--cta-color)" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#0b7a69', fontSize: 12, formatter: (v)=>`${v}h` }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </motion.div>
        )}

        {activeTab === 'projects' && (
          <motion.div key="projects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {!selectedProject ? (
              <>
                <div className="card mb-6 flex items-center justify-between">
                  <h3 className="mb-0">Add New Active Project</h3>
                  <form onSubmit={handleAddProject} className="flex gap-4">
                    <input type="text" className="input" placeholder="e.g. Ply Cutter Phase 2" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} required />
                    <button type="submit" className="btn btn-primary whitespace-nowrap"><FolderOpen size={16} className="inline mr-2" /> Create Project</button>
                  </form>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {projects.map(p => (
                    <div
                      key={p.id}
                      className="card flex flex-col justify-between cursor-pointer hover:border-cta-color transition-colors"
                      style={{ padding: '1.5rem', minHeight: '120px' }}
                      onClick={() => setSelectedProject(p)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        {editingProjectId === p.id ? (
                          <form onSubmit={(e) => handleEditProjectSubmit(e, p.id)} className="flex items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                            <input type="text" className="input" style={{ padding: '0.2rem 0.5rem' }} value={editingProjectName} onChange={(e) => setEditingProjectName(e.target.value)} autoFocus />
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.2rem 0.5rem' }}>Save</button>
                            <button type="button" className="btn btn-outline" style={{ padding: '0.2rem 0.5rem' }} onClick={(e) => { e.stopPropagation(); setEditingProjectId(null); }}>Cancel</button>
                          </form>
                        ) : (
                          <>
                            <span className="font-bold text-lg">{p.name}</span>
                            <div className="flex gap-2">
                              <button 
                                className="text-gray-500 hover:bg-gray-100 p-1 rounded"
                                onClick={(e) => { e.stopPropagation(); setEditingProjectId(p.id); setEditingProjectName(p.name); }}
                                title="Edit Project"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                className="text-danger-color hover:bg-red-50 p-1 rounded"
                                onClick={(e) => handleDeleteProject(p.id, e)}
                                title="Delete Project"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex justify-end items-center mt-auto">
                        <span className="text-xs text-cta-color">View Details &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card mt-8">
                  <h3 className="mb-4 flex items-center gap-2"><Users size={18} /> Operators (Admin)</h3>
                  <p className="text-sm text-muted mb-4">Operators don't get individual logins — they just pick their name from this list when logging activity.</p>
                  <form onSubmit={handleAddOperator} className="flex gap-4 mb-4">
                    <input type="text" className="input" placeholder="e.g. Sapan Desai" value={newOperatorName} onChange={(e) => setNewOperatorName(e.target.value)} />
                    <button type="submit" className="btn btn-outline whitespace-nowrap">Add Operator</button>
                  </form>
                  <div className="flex flex-wrap gap-2">
                    {operatorNames.map(n => (
                      editingOperatorNameOld === n ? (
                        <form key={n} onSubmit={(e) => handleEditOperatorSubmit(e, n)} className="flex items-center gap-1">
                          <input type="text" className="input" style={{ padding: '0.2rem 0.5rem', width: '150px' }} value={editingOperatorNameNew} onChange={(e) => setEditingOperatorNameNew(e.target.value)} autoFocus />
                          <button type="submit" className="btn btn-primary" style={{ padding: '0.2rem 0.5rem' }}>Save</button>
                          <button type="button" className="btn btn-outline" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setEditingOperatorNameOld(null)}>Cancel</button>
                        </form>
                      ) : (
                        <span key={n} className="badge bg-gray-100 text-gray-700 border border-gray-300 flex items-center gap-2">
                          {n}
                          <Edit2 size={12} className="cursor-pointer text-gray-500 hover:text-gray-800" onClick={() => { setEditingOperatorNameOld(n); setEditingOperatorNameNew(n); }} />
                          <X size={12} className="cursor-pointer text-gray-500 hover:text-red-500" onClick={() => handleRemoveOperator(n)} />
                        </span>
                      )
                    ))}
                    {operatorNames.length === 0 && <span className="text-sm text-muted">No operators added yet.</span>}
                  </div>
                </div>

                <div className="card mt-8">
                  <h3 className="mb-4 flex items-center gap-2"><Wrench size={18} /> Machine Names (Admin)</h3>
                  <form onSubmit={handleAddMachine} className="flex gap-4 mb-4">
                    <input type="text" className="input" placeholder="e.g. Router 03" value={newMachineName} onChange={(e) => setNewMachineName(e.target.value)} />
                    <button type="submit" className="btn btn-outline whitespace-nowrap">Add Machine</button>
                  </form>
                  <div className="flex flex-wrap gap-2">
                    {machines.map(m => (
                      editingMachineNameId === m.id ? (
                        <form key={m.id} onSubmit={(e) => handleEditMachineNameSubmit(e, m.id)} className="flex items-center gap-1">
                          <input type="text" className="input" style={{ padding: '0.2rem 0.5rem', width: '150px' }} value={editingMachineNameValue} onChange={(e) => setEditingMachineNameValue(e.target.value)} autoFocus />
                          <button type="submit" className="btn btn-primary" style={{ padding: '0.2rem 0.5rem' }}>Save</button>
                          <button type="button" className="btn btn-outline" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setEditingMachineNameId(null)}>Cancel</button>
                        </form>
                      ) : (
                        <span key={m.id} className="badge bg-gray-100 text-gray-700 border border-gray-300 flex items-center gap-2">
                          {m.name}
                          <Edit2 size={12} className="cursor-pointer text-gray-500 hover:text-gray-800" onClick={() => { setEditingMachineNameId(m.id); setEditingMachineNameValue(m.name); }} />
                        </span>
                      )
                    ))}
                    {machines.length === 0 && <span className="text-sm text-muted">No machines added yet.</span>}
                  </div>
                </div>

                <div className="card mt-8">
                  <h3 className="mb-4 flex items-center gap-2"><Activity size={18} /> Activity Types (Admin)</h3>
                  <form onSubmit={handleAddActivityType} className="flex gap-4 mb-4">
                    <input type="text" className="input" placeholder="e.g. Quality Check" value={newActivityType} onChange={(e) => setNewActivityType(e.target.value)} />
                    <button type="submit" className="btn btn-outline whitespace-nowrap">Add Activity Type</button>
                  </form>
                  <div className="flex flex-wrap gap-2">
                    {activityTypesList.map(t => (
                      editingActivityTypeOld === t ? (
                        <form key={t} onSubmit={(e) => handleEditActivityTypeSubmit(e, t)} className="flex items-center gap-1">
                          <input type="text" className="input" style={{ padding: '0.2rem 0.5rem', width: '200px' }} value={editingActivityTypeNew} onChange={(e) => setEditingActivityTypeNew(e.target.value)} autoFocus />
                          <button type="submit" className="btn btn-primary" style={{ padding: '0.2rem 0.5rem' }}>Save</button>
                          <button type="button" className="btn btn-outline" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setEditingActivityTypeOld(null)}>Cancel</button>
                        </form>
                      ) : (
                        <span key={t} className="badge bg-gray-100 text-gray-700 border border-gray-300 flex items-center gap-2">
                          {t}
                          <Edit2 size={12} className="cursor-pointer text-gray-500 hover:text-gray-800" onClick={() => { setEditingActivityTypeOld(t); setEditingActivityTypeNew(t); }} />
                          <X size={12} className="cursor-pointer text-gray-500 hover:text-red-500" onClick={() => handleRemoveActivityType(t)} />
                        </span>
                      )
                    ))}
                    {activityTypesList.length === 0 && <span className="text-sm text-muted">No activity types added yet.</span>}
                  </div>
                </div>
              </>
            ) : (
              <div className="card">
                <div className="flex items-center gap-4 mb-6 border-b pb-4">
                  <button className="btn btn-outline p-2" onClick={() => setSelectedProject(null)}><ArrowLeft size={18} /></button>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedProject.name}</h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-bold mb-4 text-lg">Machine Logs</h4>
                    <div className="space-y-2">
                      {machineLogs.filter(l => l.projectId === selectedProject.id).map(log => (
                        <div key={log.id} className="p-3 bg-gray-50 rounded border text-sm flex justify-between">
                          <div>
                            <p className="font-bold">{machines.find(m => m.id === log.machineId)?.name || log.machineId} <span className="text-muted font-normal">({log.activityType})</span></p>
                            <p className="text-xs text-gray-500">{log.endDate && log.endDate !== log.date ? `${formatDate(log.date)} - ${formatDate(log.endDate)}` : formatDate(log.date)} | {operatorDisplay(log)}</p>
                          </div>
                          <div className="font-mono font-bold text-cta-color">{log.netHours}</div>
                        </div>
                      ))}
                      {machineLogs.filter(l => l.projectId === selectedProject.id).length === 0 && <p className="text-muted text-sm">No machine logs.</p>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold mb-4 text-lg">Expense Logs</h4>
                    <div className="space-y-2">
                      {allExpenses.filter(e => e.projectId === selectedProject.id).map(exp => (
                        <div key={exp.id} className="p-3 bg-gray-50 rounded border text-sm flex justify-between">
                          <div>
                            <p className="font-bold">{exp.description}</p>
                            <p className="text-xs text-gray-500">{formatDate(exp.date)} | {exp.category}</p>
                          </div>
                          <div className="font-mono font-bold text-danger-color">₹{Number(exp.amount).toLocaleString()}</div>
                        </div>
                      ))}
                      {allExpenses.filter(e => e.projectId === selectedProject.id).length === 0 && <p className="text-muted text-sm">No expenses.</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'machines' && (
          <motion.div key="machines" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            <div className="card mb-6">
              <h3 className="mb-4">Maintenance Types (Admin)</h3>
              <form onSubmit={handleAddMaintType} className="flex gap-4 mb-4">
                <input type="text" className="input" placeholder="e.g. Filter Change" value={newMaintType} onChange={(e) => setNewMaintType(e.target.value)} />
                <button type="submit" className="btn btn-outline whitespace-nowrap">Add Type</button>
              </form>
              <div className="flex flex-wrap gap-2">
                {maintenanceTypes.map(t => (
                  <span key={t} className="badge bg-gray-100 text-gray-700 border border-gray-300">{t}</span>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="mb-6">Machine Activity Log</h3>
              <div className="grid gap-4">
                {machines.map(m => (
                  <div key={m.id} className="p-4" style={{ background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 className="font-bold text-lg mb-1">{m.name}
                        {m.pendingReview && <span className="badge badge-success ml-2" style={{ fontSize: '0.7rem' }}>Operator marked done — review schedule</span>}
                      </h4>
                      <p className="text-sm text-muted mb-1 flex items-center gap-2"><Wrench size={14} /> Last Maintenance: {formatDate(m.lastMaintenance)}</p>
                      <p className="text-sm flex items-center gap-2" style={{ color: new Date(m.nextMaintenance) < new Date() ? '#f43f5e' : '#10b981' }}>
                        <Calendar size={14} /> Next Due: {formatDate(m.nextMaintenance)}
                      </p>
                    </div>
                    <div>
                      {editingMachine === m.id ? (
                        <form onSubmit={handleUpdateMaintenance} className="flex gap-2">
                          <input type="date" className="input" style={{ width: 'auto' }} value={newMaintenanceDate} onChange={(e) => setNewMaintenanceDate(e.target.value)} required />
                          <button type="submit" className="btn btn-primary">Save</button>
                          <button type="button" className="btn btn-outline" onClick={() => setEditingMachine(null)}>Cancel</button>
                        </form>
                      ) : (
                        <button className="btn btn-outline" onClick={() => setEditingMachine(m.id)}>Update Schedule</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'forecast' && (
          <motion.div key="forecast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            
            <div className="card mb-6">
              <h3 className="mb-4">Add Machine Forecast</h3>
              <form onSubmit={handleAddForecast} className="flex flex-wrap gap-4 items-end">
                <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
                  <label>Machine</label>
                  <select className="select" value={newForecastMachineId} onChange={e => setNewForecastMachineId(e.target.value)} required>
                    <option value="">Select...</option>
                    {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
                  <label>Project</label>
                  <select className="select" value={newForecastProjectId} onChange={e => setNewForecastProjectId(e.target.value)} required>
                    <option value="">Select...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: '130px' }}>
                  <label>Month</label>
                  <input type="month" className="input" value={newForecastMonth} onChange={e => setNewForecastMonth(e.target.value)} required />
                </div>
                <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: '120px' }}>
                  <label>Expected Hours</label>
                  <input type="number" step="0.5" className="input" placeholder="e.g. 50" value={newForecastHours} onChange={e => setNewForecastHours(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary whitespace-nowrap mb-[2px]">Add Forecast</button>
              </form>
            </div>

            <div className="card mb-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="mb-0 flex items-center gap-2"><TrendingUp size={18} /> Forecast vs Actuals</h3>
                <div className="text-sm text-muted">
                  Note: "Actuals" uses the date filters and dropdowns from the Projectwise Log tab. "Forecasts" use the Utilization Month filter.
                </div>
              </div>
              
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecastChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 12}} />
                    <YAxis tick={{fill: '#94a3b8', fontSize: 12}} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                    <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} formatter={(val) => `${val} hrs`} />
                    
                    <Bar dataKey="forecast" name="Forecast" fill="#eab308" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#ca8a04', fontSize: 12 }} />
                    <Bar dataKey="actual" name="Actuals" fill="var(--cta-color)" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#0b7a69', fontSize: 12 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 className="mb-4">Forecast Entries</h3>
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="sticky top-0 bg-white shadow-sm">
                    <tr>
                      <th className="py-3 px-4 text-muted font-semibold">Month</th>
                      <th className="py-3 px-4 text-muted font-semibold">Machine</th>
                      <th className="py-3 px-4 text-muted font-semibold">Project</th>
                      <th className="py-3 px-4 text-muted font-semibold text-right">Hours</th>
                      <th className="py-3 px-4 text-muted font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecasts.map(f => {
                      const m = machines.find(mac => mac.id === f.machineId);
                      const p = projects.find(proj => proj.id === f.projectId);
                      return (
                        <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm font-medium">{f.month}</td>
                          <td className="py-3 px-4">{m ? m.name : f.machineId}</td>
                          <td className="py-3 px-4 text-muted">{p ? p.name : f.projectId}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-cta-color">{f.hours}</td>
                          <td className="py-3 px-4 text-right">
                            <button className="text-danger-color p-1 hover:bg-red-50 rounded" onClick={() => handleDeleteForecast(f.id)}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {forecasts.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-muted">No forecasts added.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {drillDownPeriod && (
          <Modal title={`Transactions — ${drillDownPeriod.label}`} onClose={() => setDrillDownPeriod(null)} maxWidth="700px">
            {drillDownTransactions.length === 0 ? (
              <p className="text-muted">No transactions found for this period.</p>
            ) : (
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="sticky top-0 bg-white">
                    <tr>
                      <th className="py-2 px-3 text-muted font-semibold">Date</th>
                      <th className="py-2 px-3 text-muted font-semibold">Type</th>
                      <th className="py-2 px-3 text-muted font-semibold">Description</th>
                      <th className="py-2 px-3 text-muted font-semibold">Category</th>
                      <th className="py-2 px-3 text-muted font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillDownTransactions.map(t => (
                      <tr key={t.id} className="border-b border-gray-100">
                        <td className="py-2 px-3 text-sm">{formatDate(t.date)}</td>
                        <td className="py-2 px-3">
                          {t.type === 'credit'
                            ? <span className="badge badge-success">IN</span>
                            : <span className="badge badge-danger">OUT</span>}
                        </td>
                        <td className="py-2 px-3">{t.description}</td>
                        <td className="py-2 px-3">{t.category}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold" style={{ color: t.type === 'credit' ? '#10b981' : '#f43f5e' }}>
                          {t.type === 'credit' ? '+' : '-'}₹{Number(t.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Modal>
        )}

        {viewingPhoto && (
          <Modal title="Machine Photo" onClose={() => setViewingPhoto(null)} maxWidth="600px">
            <img src={viewingPhoto} alt="Machine state" style={{ width: '100%', borderRadius: '8px' }} />
          </Modal>
        )}

        {editingMachineLog && (
          <Modal title="Edit Machine Log" onClose={() => setEditingMachineLog(null)} maxWidth="500px">
            <form onSubmit={handleUpdateMachineLog}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="input-group">
                  <label>Start Date</label>
                  <input type="date" className="input" value={editLogData.date} onChange={e => setEditLogData({...editLogData, date: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label>End Date</label>
                  <input type="date" className="input" value={editLogData.endDate} onChange={e => setEditLogData({...editLogData, endDate: e.target.value})} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="input-group">
                  <label>Machine</label>
                  <select className="select" value={editLogData.machineId} onChange={e => setEditLogData({...editLogData, machineId: e.target.value})} required>
                    {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Project</label>
                  <select className="select" value={editLogData.projectId} onChange={e => setEditLogData({...editLogData, projectId: e.target.value})} required>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="input-group">
                  <label>Activity</label>
                  <input type="text" className="input" value={editLogData.activityType} onChange={e => setEditLogData({...editLogData, activityType: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Operator</label>
                  <input type="text" className="input" value={editLogData.operatorName} onChange={e => setEditLogData({...editLogData, operatorName: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Hours</label>
                  <input type="number" step="0.1" className="input font-mono font-bold" value={editLogData.netHours} onChange={e => setEditLogData({...editLogData, netHours: e.target.value})} required />
                </div>
              </div>
              <div className="flex gap-4">
                <button type="submit" className="btn btn-primary flex-1">Save Changes</button>
                <button type="button" className="btn btn-outline flex-1" onClick={() => setEditingMachineLog(null)}>Cancel</button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
