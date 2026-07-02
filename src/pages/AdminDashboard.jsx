import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getFinancialSummary, getProjects, addProject, getMachines, updateMachineMaintenance, getMachineLogs, getExpenses, getCashIn, getOperatorNames, addOperatorName, removeOperatorName, getCashAlertThreshold, setCashAlertThreshold } from '../services/db';
import { Activity, Wrench, FolderOpen, Calendar, ArrowLeft, Download, FileText, Users, X, AlertTriangle, Camera, Gauge } from 'lucide-react';
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

  // Forms
  const [newProjectName, setNewProjectName] = useState('');
  const [editingMachine, setEditingMachine] = useState(null);
  const [newMaintenanceDate, setNewMaintenanceDate] = useState('');

  const [selectedProject, setSelectedProject] = useState(null);
  const [maintenanceTypes, setMaintenanceTypes] = useState(
    JSON.parse(localStorage.getItem('valk_maint_types')) || ['Oil Change', 'Cleaning', 'Part Replacement']
  );
  const [newMaintType, setNewMaintType] = useState('');
  const [operatorNames, setOperatorNames] = useState([]);
  const [newOperatorName, setNewOperatorName] = useState('');

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

  const [viewingPhoto, setViewingPhoto] = useState(null);

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

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProjectName) return;
    await addProject(newProjectName);
    setNewProjectName('');
    fetchData();
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
    if(!machineSummary[log.machineId]) machineSummary[log.machineId] = {};
    if(!machineSummary[log.machineId][log.projectId]) machineSummary[log.machineId][log.projectId] = 0;
    machineSummary[log.machineId][log.projectId] += parseHours(log.netHours);
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

  // Utilization % per machine (this calendar month)
  const now = new Date();
  const daysElapsedThisMonth = now.getDate();
  const availableHoursThisMonth = daysElapsedThisMonth * WORK_HOURS_PER_DAY;
  const utilizationByMachine = machines.map(m => {
    const hoursThisMonth = machineLogs
      .filter(l => l.machineId === m.id && (() => {
        const d = new Date(l.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })())
      .reduce((s, l) => s + parseHours(l.netHours), 0);
    const pct = availableHoursThisMonth > 0 ? Math.min(100, (hoursThisMonth / availableHoursThisMonth) * 100) : 0;
    return { ...m, hoursThisMonth, pct };
  });

  // Filtered ledger rows
  const visibleMachineLogs = (machineLogDateFrom || machineLogDateTo) ? machineLogs.filter(l => isWithinRange(l.date, machineLogDateFrom, machineLogDateTo)) : machineLogs;
  const visibleExpenses = (expenseDateFrom || expenseDateTo) ? allExpenses.filter(e => isWithinRange(e.date, expenseDateFrom, expenseDateTo)) : allExpenses;

  const handleExportMachineLogs = () => {
    exportToCsv('machine_activity_log.csv', visibleMachineLogs.map(l => ({
      date: formatDate(l.date), operator: operatorDisplay(l), activityType: l.activityType,
      machine: l.machineId, project: l.projectId, hours: l.netHours, notes: l.notes || ''
    })));
  };

  const handleExportMachineLogsPdf = () => {
    exportToPdf('machine_activity_log.pdf', 'Machine Log', ['Date', 'Operator', 'Activity', 'Machine', 'Project', 'Duration'],
      visibleMachineLogs.map(l => [formatDate(l.date), operatorDisplay(l), l.activityType || 'N/A', l.machineId, l.projectId, l.netHours]));
  };

  const handleExportExpenses = () => {
    exportToCsv('expense_ledger.csv', visibleExpenses.map(e => ({
      date: formatDate(e.date), description: e.description, category: e.category,
      project: e.projectId || '', amount: e.amount, operator: e.operatorName || ''
    })));
  };

  const handleExportExpensesPdf = () => {
    exportToPdf('expense_ledger.pdf', 'Expense Ledger', ['Date', 'Description', 'Category', 'Project', 'Amount'],
      visibleExpenses.map(e => [formatDate(e.date), e.description, e.category, e.projectId || '-', `Rs ${Number(e.amount).toLocaleString()}`]));
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
          <Activity size={16} /> Synthesis - Cash
        </button>
        <button className={`btn ${activeTab === 'ledgers' ? 'btn-primary' : 'btn-outline'}`} onClick={() => {setActiveTab('ledgers'); setSelectedProject(null);}}>
          <FolderOpen size={16} /> Synthesis - M/C
        </button>
        <button className={`btn ${activeTab === 'projects' ? 'btn-primary' : 'btn-outline'}`} onClick={() => {setActiveTab('projects'); setSelectedProject(null);}}>
          <Activity size={16} /> Projects
        </button>
        <button className={`btn ${activeTab === 'machines' ? 'btn-primary' : 'btn-outline'}`} onClick={() => {setActiveTab('machines'); setSelectedProject(null);}}>
          <Wrench size={16} /> Machine Activity Log
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
                        <td className="py-3 px-4 text-muted">{exp.projectId || '-'}</td>
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
            <div className="card">
              <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <h3 className="mb-0">Machine Log</h3>
                <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
                  <DateRangeFilter from={machineLogDateFrom} to={machineLogDateTo} onFromChange={setMachineLogDateFrom} onToChange={setMachineLogDateTo} />
                  <div className="flex gap-2">
                    <button className="btn btn-outline text-sm" onClick={handleExportMachineLogs}><Download size={14} /> CSV</button>
                    <button className="btn btn-outline text-sm" onClick={handleExportMachineLogsPdf}><FileText size={14} /> PDF</button>
                  </div>
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
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMachineLogs.map(log => (
                      <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{log.endDate && log.endDate !== log.date ? `${formatDate(log.date)} - ${formatDate(log.endDate)}` : formatDate(log.date)}</td>
                        <td className="py-3 px-4 font-medium">{operatorDisplay(log)}</td>
                        <td className="py-3 px-4 text-xs">
                          <span className="bg-gray-100 px-2 py-1 rounded">{log.activityType || 'N/A'}</span>
                        </td>
                        <td className="py-3 px-4 text-muted">{log.machineId}</td>
                        <td className="py-3 px-4">{log.projectId}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-cta-color">{log.netHours}</td>
                        <td className="py-3 px-4 text-center">
                          {log.photo ? (
                            <button type="button" className="btn btn-outline" style={{ padding: '0.3rem' }} onClick={() => setViewingPhoto(log.photo)}>
                              <Camera size={14} />
                            </button>
                          ) : <span className="text-muted">-</span>}
                        </td>
                      </tr>
                    ))}
                    {visibleMachineLogs.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-8 text-muted">No machine logs in this range.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Utilization % per machine */}
            <div className="card">
              <h3 className="mb-2 flex items-center gap-2"><Gauge size={18} /> Machine Utilization (This Month)</h3>
              <p className="text-xs text-muted mb-6">Logged hours vs. available shift hours ({WORK_HOURS_PER_DAY}h/day × {daysElapsedThisMonth} days elapsed this month).</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {utilizationByMachine.map(m => (
                  <div key={m.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold">{m.name}</span>
                      <span className="font-mono font-bold text-cta-color">{m.pct.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', background: '#e2e8f0', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${m.pct}%`, background: 'var(--cta-color)', borderRadius: '4px' }}></div>
                    </div>
                    <p className="text-xs text-muted mt-2">{m.name} ran {m.pct.toFixed(0)}% of available hours this month ({formatHours(m.hoursThisMonth)} logged).</p>
                  </div>
                ))}
                {utilizationByMachine.length === 0 && <p className="text-muted">No machines yet.</p>}
              </div>
            </div>

            {/* Machine Run Time (moved from Synthesis - Cash) */}
            <div className="card">
              <h3 className="mb-6">Machine Run Time</h3>
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="sticky top-0 bg-white shadow-sm">
                    <tr>
                      <th className="py-3 px-4 text-muted font-semibold">Date</th>
                      {activityTypesSeen.map(t => (
                        <th key={t} className="py-3 px-4 text-muted font-semibold text-right">{t}</th>
                      ))}
                      <th className="py-3 px-4 text-muted font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySummaryRows.map(([day, row]) => (
                      <tr key={day} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium">{day}</td>
                        {activityTypesSeen.map(t => (
                          <td key={t} className="py-3 px-4 text-right font-mono text-sm">{(row.byType[t] || 0).toFixed(1)}</td>
                        ))}
                        <td className="py-3 px-4 text-right font-mono font-bold text-cta-color">{row.total.toFixed(1)}</td>
                      </tr>
                    ))}
                    {dailySummaryRows.length === 0 && (
                      <tr><td colSpan={activityTypesSeen.length + 2} className="text-center py-8 text-muted">No machine logs yet.</td></tr>
                    )}
                  </tbody>
                  {dailySummaryRows.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-gray-300">
                        <td className="py-3 px-4 font-bold">Grand Total</td>
                        {activityTypesSeen.map(t => (
                          <td key={t} className="py-3 px-4 text-right font-mono font-bold">{grandTotalsByType[t].toFixed(1)}</td>
                        ))}
                        <td className="py-3 px-4 text-right font-mono font-bold text-cta-color">{grandTotalHours.toFixed(1)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Per-Machine Project Summary (moved from Synthesis - Cash) */}
            <div className="card">
              <h3 className="mb-6">Per-Machine Project Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(machineSummary).map(([machId, projs]) => (
                  <div key={machId} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                    <h4 className="font-bold text-lg mb-3 pb-2 border-b border-gray-200">{machId}</h4>
                    <div className="flex flex-col gap-2">
                      {Object.entries(projs).map(([projId, decimalHrs]) => (
                        <div key={projId} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">{projId}</span>
                          <span className="font-mono font-bold text-cta-color">{formatHours(decimalHrs)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {Object.keys(machineSummary).length === 0 && <p className="text-muted">No machine logs yet.</p>}
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
                      <span className="font-bold text-lg mb-2">{p.name}</span>
                      <div className="flex justify-between items-center mt-auto">
                        <span className="badge font-mono">{p.id}</span>
                        <span className="text-xs text-cta-color">View Details &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="card">
                <div className="flex items-center gap-4 mb-6 border-b pb-4">
                  <button className="btn btn-outline p-2" onClick={() => setSelectedProject(null)}><ArrowLeft size={18} /></button>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedProject.name}</h2>
                    <p className="text-muted font-mono">ID: {selectedProject.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-bold mb-4 text-lg">Machine Logs</h4>
                    <div className="space-y-2">
                      {machineLogs.filter(l => l.projectId === selectedProject.id).map(log => (
                        <div key={log.id} className="p-3 bg-gray-50 rounded border text-sm flex justify-between">
                          <div>
                            <p className="font-bold">{log.machineId} <span className="text-muted font-normal">({log.activityType})</span></p>
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

            <div className="card mb-6">
              <h3 className="mb-4 flex items-center gap-2"><Users size={18} /> Operators (Admin)</h3>
              <p className="text-sm text-muted mb-4">Operators don't get individual logins — they just pick their name from this list when logging activity.</p>
              <form onSubmit={handleAddOperator} className="flex gap-4 mb-4">
                <input type="text" className="input" placeholder="e.g. Sapan Desai" value={newOperatorName} onChange={(e) => setNewOperatorName(e.target.value)} />
                <button type="submit" className="btn btn-outline whitespace-nowrap">Add Operator</button>
              </form>
              <div className="flex flex-wrap gap-2">
                {operatorNames.map(n => (
                  <span key={n} className="badge bg-gray-100 text-gray-700 border border-gray-300 flex items-center gap-2">
                    {n}
                    <X size={12} className="cursor-pointer" onClick={() => handleRemoveOperator(n)} />
                  </span>
                ))}
                {operatorNames.length === 0 && <span className="text-sm text-muted">No operators added yet.</span>}
              </div>
            </div>

            <div className="card">
              <h3 className="mb-6">Machine Activity Log</h3>
              <div className="grid gap-4">
                {machines.map(m => (
                  <div key={m.id} className="p-4" style={{ background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 className="font-bold text-lg mb-1">{m.name} <span className="text-muted font-mono text-sm ml-2">{m.id}</span>
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
      </AnimatePresence>
    </div>
  );
}
