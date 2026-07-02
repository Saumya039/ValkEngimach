import { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Send, Watch, Activity, IndianRupee, CheckCircle, ChevronDown, Trash2, BookOpen, Edit2, XCircle } from 'lucide-react';
import { addMachineLog, getProjects, getMachines, addExpense, suggestExpenseCategory, getOperatorNames, getActivityTypes, reportMaintenanceDone, getCashIn, getExpenses, getMachineLogs, updateMachineLog, updateExpense } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate, MIN_RECORD_DATE } from '../utils/dateFormat';

export default function OperatorLog() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('machine');

  // Metadata
  const [projects, setProjects] = useState([]);
  const [machines, setMachines] = useState([]);
  const [operatorNames, setOperatorNames] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');

  // Machine Log State
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOperators, setSelectedOperators] = useState([]);
  const [operatorDropdownOpen, setOperatorDropdownOpen] = useState(false);
  const [machineId, setMachineId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [activityType, setActivityType] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Expense State (current line being edited)
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expAmount, setExpAmount] = useState('');
  const [expDescription, setExpDescription] = useState('');
  const [expCategory, setExpCategory] = useState('Not clear');
  const [expProjectId, setExpProjectId] = useState('');
  const [expenseQueue, setExpenseQueue] = useState([]);

  // Master Ledger (read-only)
  const [ledgerCashIn, setLedgerCashIn] = useState([]);
  const [ledgerExpenses, setLedgerExpenses] = useState([]);

  // Recent Logs & Editing
  const [recentMachineLogs, setRecentMachineLogs] = useState([]);
  const [editingLogId, setEditingLogId] = useState(null);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Last saved timestamps (per data entry page)
  const [lastSavedMachineLog, setLastSavedMachineLog] = useState(localStorage.getItem('valk_last_saved_machine_log') || '');
  const [lastSavedExpense, setLastSavedExpense] = useState(localStorage.getItem('valk_last_saved_expense') || '');

  const formatSavedAt = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${formatDate(iso)}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Maintenance Alert
  const [maintenanceAlerts, setMaintenanceAlerts] = useState([]);

  useEffect(() => {
    fetchData();
  }, [user, activeTab]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported on this device');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setLocationError(err.message || 'Location unavailable')
    );
  }, []);

  const fetchData = async () => {
    getProjects().then(setProjects);
    getOperatorNames().then(setOperatorNames);
    getActivityTypes().then(setActivityTypes);
    refreshMachines();

    const mLogs = await getMachineLogs();
    setRecentMachineLogs(mLogs);

    if (activeTab === 'expense' || activeTab === 'ledger') {
      const exps = await getExpenses();
      setRecentExpenses(exps);

      getCashIn().then(setLedgerCashIn);
      setLedgerExpenses(exps);
    }
  };

  const refreshMachines = () => {
    getMachines().then(machs => {
      setMachines(machs);
      const alerts = machs.filter(m => new Date(m.nextMaintenance) <= new Date() && !m.pendingReview);
      setMaintenanceAlerts(alerts);
    });
  };

  const handleMarkMaintenanceDone = async (machineId) => {
    await reportMaintenanceDone(machineId);
    refreshMachines();
    setSuccessMsg("Marked as done — admin will update the schedule.");
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const toggleOperator = (name) => {
    setSelectedOperators(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera", err);
      alert("Could not access camera. Please allow permissions.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      setPhoto(canvasRef.current.toDataURL('image/jpeg'));
      videoRef.current.srcObject?.getTracks().forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const netHoursFromTimes = () => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`${logDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    const diffMs = end - start;
    let mins = diffMs / 1000 / 60;
    return Math.round((mins / 60) * 100) / 100;
  };
  const computedHours = netHoursFromTimes();
  const machineSubmitDisabled = submitting || computedHours <= 0;

  const handleMachineSubmit = async (e) => {
    e.preventDefault();
    if (selectedOperators.length === 0) return alert("Please select at least one operator.");
    if (!startTime || !endTime) return alert("Please enter machine start and end time.");
    if (computedHours <= 0) return alert("End time must be after start time.");

    setSubmitting(true);
    try {
      const payload = {
        date: logDate,
        endDate: endDate,
        operatorId: user.id,
        operatorNames: selectedOperators,
        machineId,
        projectId,
        activityType,
        startTime,
        endTime,
        netHours: computedHours,
        notes,
        ...(location && { location }),
        ...(photo && { photo })
      };
      
      if (editingLogId) {
        await updateMachineLog(editingLogId, payload);
        setSuccessMsg("Machine log updated!");
        setEditingLogId(null);
      } else {
        await addMachineLog(payload);
        setSuccessMsg("Machine log saved!");
      }
      const savedAt = new Date().toISOString();
      localStorage.setItem('valk_last_saved_machine_log', savedAt);
      setLastSavedMachineLog(savedAt);
      setTimeout(() => setSuccessMsg(''), 3000);
      setPhoto(null); setStartTime(''); setEndTime(''); setNotes('');
      fetchData();
    } catch (err) {
      alert("Failed to save log.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMachineLog = (log) => {
    setEditingLogId(log.id);
    setMachineId(log.machineId);
    setProjectId(log.projectId);
    setLogDate(log.date);
    setEndDate(log.endDate);
    setSelectedOperators(log.operatorNames || []);
    setActivityType(log.activityType);
    setStartTime(log.startTime);
    setEndTime(log.endTime);
    setNotes(log.notes || '');
    setPhoto(log.photo || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditMachineLog = () => {
    setEditingLogId(null);
    setPhoto(null); setStartTime(''); setEndTime(''); setNotes('');
  };

  const onDescriptionChange = (text) => {
    setExpDescription(text);
    setExpCategory(suggestExpenseCategory(text));
  };

  const resetExpenseLine = () => {
    setExpAmount(''); setExpDescription(''); setExpCategory('Not clear'); setExpProjectId('');
  };

  const handleAddAnotherExpense = (e) => {
    e.preventDefault();
    if (!expAmount || !expDescription) return alert("Please fill in the description and amount before adding another line.");
    setExpenseQueue(prev => [...prev, { date: expDate, amount: Number(expAmount), description: expDescription, category: expCategory, projectId: expProjectId || null }]);
    resetExpenseLine();
  };

  const handleRemoveQueuedExpense = (index) => {
    setExpenseQueue(prev => prev.filter((_, i) => i !== index));
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    
    setSubmitting(true);
    try {
      if (editingExpenseId) {
        if (!expAmount || !expDescription) return alert("Please fill in the description and amount.");
        await updateExpense(editingExpenseId, { date: expDate, amount: Number(expAmount), description: expDescription, category: expCategory, projectId: expProjectId || null });
        setSuccessMsg("Expense updated!");
        setEditingExpenseId(null);
      } else {
        const lines = [...expenseQueue];
        if (expAmount && expDescription) {
          lines.push({ date: expDate, amount: Number(expAmount), description: expDescription, category: expCategory, projectId: expProjectId || null });
        }
        if (lines.length === 0) return alert("Please add at least one expense.");
        
        for (const line of lines) {
          await addExpense({ ...line, operatorId: user.id, operatorName: user.name });
        }
        setSuccessMsg(`${lines.length} expense${lines.length > 1 ? 's' : ''} logged securely!`);
        setExpenseQueue([]);
      }
      const savedAt = new Date().toISOString();
      localStorage.setItem('valk_last_saved_expense', savedAt);
      setLastSavedExpense(savedAt);
      setTimeout(() => setSuccessMsg(''), 3000);
      resetExpenseLine();
      fetchData();
    } catch (err) {
      alert("Failed to save expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditExpense = (exp) => {
    setEditingExpenseId(exp.id);
    setExpDate(exp.date);
    setExpProjectId(exp.projectId || '');
    setExpDescription(exp.description);
    setExpAmount(exp.amount.toString());
    setExpCategory(exp.category);
    setExpenseQueue([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditExpense = () => {
    setEditingExpenseId(null);
    resetExpenseLine();
  };

  const expenseSubmitDisabled = submitting || (!editingExpenseId && expenseQueue.length === 0 && (!expAmount || !expDescription));

  // Master Ledger (read-only) data
  const ledgerRows = (() => {
    const combined = [...ledgerCashIn, ...ledgerExpenses].sort((a, b) => new Date(a.date) - new Date(b.date));
    const { rows } = combined.reduce((acc, log) => {
      const balance = acc.balance + (log.type === 'credit' ? Number(log.amount) : -Number(log.amount));
      return { balance, rows: [...acc.rows, { ...log, balance }] };
    }, { balance: 0, rows: [] });
    return [...rows].reverse();
  })();

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem', paddingBottom: '100px' }}>

      {/* MAINTENANCE ALERTS */}
      <AnimatePresence>
        {maintenanceAlerts.length > 0 && maintenanceAlerts.map(m => (
          <motion.div key={m.id} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="card mb-4 border-l-4 border-danger-color">
            <h4 className="text-danger-color font-bold mb-1">⚠️ Maintenance Due</h4>
            <p className="text-sm">Machine: <strong>{m.name}</strong></p>
            <p className="text-sm text-muted mb-2">Please perform scheduled maintenance, then mark it done below.</p>
            <button type="button" className="btn btn-outline text-sm" onClick={() => handleMarkMaintenanceDone(m.id)}>
              <CheckCircle size={14} /> Mark Maintenance Done
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      <h1 className="text-2xl font-bold mb-6">Supervisor Portal</h1>

      <div className="flex items-center gap-4 mb-6" style={{ flexWrap: 'wrap' }}>
        <button className={`btn ${activeTab === 'machine' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('machine')}>
          <Activity size={16} /> Machine Log
        </button>
        <button className={`btn ${activeTab === 'expense' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('expense')}>
          <IndianRupee size={16} /> Cash Out / Debit
        </button>
        <button className={`btn ${activeTab === 'ledger' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('ledger')}>
          <BookOpen size={16} /> Master Ledger
        </button>
      </div>

      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card mb-4" style={{ background: 'var(--success-color)', color: 'white', padding: '1rem', border: 'none' }}>
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeTab === 'machine' && (
          <motion.form key="machine" onSubmit={handleMachineSubmit} className="card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <h3 className="mb-1 text-gradient">Activity Log</h3>
            <p className="text-xs text-muted mb-4">Last data saved on Date: {lastSavedMachineLog ? formatSavedAt(lastSavedMachineLog) : 'Not saved yet'}</p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="input-group">
                <label>Machine</label>
                <select className="select font-mono" value={machineId} onChange={(e) => setMachineId(e.target.value)} required>
                  <option value="">Select Machine...</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Project Name</label>
                <select className="select" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
                  <option value="">Select Project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="input-group mb-4" style={{ position: 'relative' }}>
              <label>Operator Name(s)</label>
              <button type="button" className="select" style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setOperatorDropdownOpen(o => !o)}>
                <span>{selectedOperators.length ? selectedOperators.join(', ') : 'Select Operator(s)...'}</span>
                <ChevronDown size={16} />
              </button>
              {operatorDropdownOpen && (
                <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, padding: '0.75rem', marginTop: '0.25rem' }}>
                  {operatorNames.map(n => (
                    <label key={n} className="flex items-center gap-2" style={{ padding: '0.4rem 0', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedOperators.includes(n)} onChange={() => toggleOperator(n)} />
                      {n}
                    </label>
                  ))}
                  {operatorNames.length === 0 && <span className="text-sm text-muted">No operators available.</span>}
                  <button type="button" className="btn btn-primary text-sm w-full" style={{ marginTop: '0.5rem' }} onClick={() => setOperatorDropdownOpen(false)}>Done</button>
                </div>
              )}
            </div>

            <div className="input-group mb-4">
              <label>Activity Type</label>
              <select className="select" value={activityType} onChange={(e) => setActivityType(e.target.value)} required>
                <option value="">Select Activity Type...</option>
                {activityTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="input-group">
                <label className="flex items-center gap-2"><Watch size={16} /> Start Date</label>
                <input type="date" className="input" min={MIN_RECORD_DATE} value={logDate} onChange={(e) => setLogDate(e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="flex items-center gap-2"><Watch size={16} /> Start Time</label>
                <input type="time" className="input font-mono" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="input-group">
                <label className="flex items-center gap-2"><Watch size={16} /> End Date</label>
                <input type="date" className="input" min={MIN_RECORD_DATE} value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="flex items-center gap-2"><Watch size={16} /> End Time</label>
                <input type="time" className="input font-mono" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
              </div>
            </div>

            <div className="input-group mb-4">
              <label>Hours Worked (auto-filled)</label>
              <input type="text" className="input font-mono font-bold" value={computedHours ? computedHours.toFixed(2) : ''} readOnly disabled placeholder="Set start & end time" />
            </div>

            <div className="input-group mb-4">
              <label>Remarks / Notes</label>
              <textarea className="textarea" rows="2" value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
            </div>

            <div className="mb-4">
              <label className="font-bold mb-2 flex items-center gap-2"><MapPin size={16} /> GPS Log</label>
              {location ? <div className="badge badge-success font-mono">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</div> : <div className="badge badge-danger">{locationError || 'Fetching...'}</div>}
            </div>

            <div className="mb-8">
              <label className="font-bold mb-2 flex items-center gap-2"><Camera size={16} /> Current Machine State (Optional)</label>
              <div className="camera-preview">
                {!photo && !cameraActive && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <motion.button whileHover={{ scale: 1.05 }} type="button" onClick={startCamera} className="btn btn-outline"><Camera size={18} /> Open Camera</motion.button>
                  </div>
                )}
                {!photo && <video ref={videoRef} autoPlay playsInline style={{ display: cameraActive ? 'block' : 'none' }} />}
                {photo && <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={photo} alt="Machine" />}
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
              {cameraActive && !photo && <button type="button" onClick={capturePhoto} className="btn btn-primary w-full">Capture</button>}
              {photo && <button type="button" onClick={() => { setPhoto(null); startCamera(); }} className="btn btn-outline w-full">Retake</button>}
            </div>

            <div className="flex gap-4">
              <motion.button whileHover={!machineSubmitDisabled ? { scale: 1.02 } : {}} whileTap={!machineSubmitDisabled ? { scale: 0.98 } : {}} type="submit" className="btn btn-primary flex-1" disabled={machineSubmitDisabled}>
                <Send size={18} /> {submitting ? 'Saving...' : (editingLogId ? 'Update Log' : 'Submit Log')}
              </motion.button>
              {editingLogId && (
                <button type="button" className="btn btn-outline flex-1" onClick={cancelEditMachineLog} disabled={submitting}>
                  Cancel
                </button>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <h4 className="font-bold mb-4">Machine Logs (tap edit icon to fix an entry)</h4>
              <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
                {recentMachineLogs.map(log => {
                  const m = machines.find(mac => mac.id === log.machineId);
                  const p = projects.find(proj => proj.id === log.projectId);
                  return (
                    <div key={log.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm">{m?.name || log.machineId} &middot; {p?.name || log.projectId}</p>
                        <p className="text-xs text-muted">{formatDate(log.date)} &middot; {log.activityType} ({log.netHours} hrs)</p>
                      </div>
                      <button type="button" className="text-cta-color p-2" onClick={() => handleEditMachineLog(log)} disabled={submitting || editingLogId === log.id}>
                        <Edit2 size={16} />
                      </button>
                    </div>
                  );
                })}
                {recentMachineLogs.length === 0 && <p className="text-sm text-muted">No logs submitted yet.</p>}
              </div>
            </div>
          </motion.form>
        )}

        {activeTab === 'expense' && (
          <motion.form key="expense" onSubmit={handleExpenseSubmit} className="card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h3 className="mb-1 text-gradient">Cash Out / Debit</h3>
            <p className="text-xs text-muted mb-4">Last data saved on Date: {lastSavedExpense ? formatSavedAt(lastSavedExpense) : 'Not saved yet'}</p>

            {expenseQueue.length > 0 && (
              <div className="mb-6" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem' }}>
                <p className="text-sm font-bold mb-2">Queued entries ({expenseQueue.length})</p>
                {expenseQueue.map((line, i) => (
                  <div key={i} className="flex justify-between items-center text-sm py-1" style={{ borderBottom: i < expenseQueue.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <span>{line.description} — ₹{line.amount}</span>
                    <Trash2 size={14} className="cursor-pointer text-danger-color" onClick={() => handleRemoveQueuedExpense(i)} />
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="input-group">
                <label>Date</label>
                <input type="date" className="input" min={MIN_RECORD_DATE} value={expDate} onChange={(e) => setExpDate(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Project (Optional)</label>
                <select className="select" value={expProjectId} onChange={(e) => setExpProjectId(e.target.value)}>
                  <option value="">None / General</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="input-group">
              <label>Description of Expense</label>
              <input type="text" className="input" placeholder="e.g. bought 10mm drill bits" value={expDescription} onChange={(e) => onDescriptionChange(e.target.value)} />
            </div>

            <div className="input-group">
              <label>Amount (₹)</label>
              <input type="number" step="0.01" className="input font-mono" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
            </div>

            <div className="input-group mb-6">
              <label>Category</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <select className="select" style={{ flex: 1 }} value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
                  <option value="Not clear">Not clear</option>
                  <option value="Asset">Asset</option>
                  <option value="Advance Salary">Advance Salary</option>
                  <option value="Job work">Job work</option>
                  <option value="Meal and Tea etc">Meal and Tea etc</option>
                  <option value="Non Production Consumable">Non Production Consumable</option>
                  <option value="Production Consumable">Production Consumable</option>
                  <option value="Travel Allowance">Travel Allowance</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Tools and Hardware">Tools and Hardware</option>
                  <option value="Raw Material">Raw Material</option>
                  <option value="Other">Other</option>
                </select>
                {expCategory !== 'Not clear' && (
                  <span className="badge badge-success">✨ AI Tagged</span>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              {!editingExpenseId && (
                <button type="button" className="btn btn-outline flex-1" onClick={handleAddAnotherExpense} disabled={submitting}>
                  + Add Another Entry
                </button>
              )}
              <motion.button whileHover={!expenseSubmitDisabled ? { scale: 1.02 } : {}} whileTap={!expenseSubmitDisabled ? { scale: 0.98 } : {}} type="submit" className="btn btn-primary flex-1" disabled={expenseSubmitDisabled}>
                <Send size={18} /> {submitting ? 'Saving...' : (editingExpenseId ? 'Update Expense' : `Submit${expenseQueue.length ? ` All (${expenseQueue.length + (expAmount && expDescription ? 1 : 0)})` : ''}`)}
              </motion.button>
              {editingExpenseId && (
                <button type="button" className="btn btn-outline flex-1" onClick={cancelEditExpense} disabled={submitting}>
                  Cancel
                </button>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <h4 className="font-bold mb-4">Cash Out Entries (tap edit icon to fix an entry)</h4>
              <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
                {recentExpenses.map(exp => {
                  const p = projects.find(proj => proj.id === exp.projectId);
                  return (
                    <div key={exp.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm">₹{exp.amount} &middot; {exp.category}</p>
                        <p className="text-xs text-muted">{formatDate(exp.date)} &middot; {exp.description}</p>
                        {p && <p className="text-xs text-cta-color mt-1">{p.name}</p>}
                      </div>
                      <button type="button" className="text-cta-color p-2" onClick={() => handleEditExpense(exp)} disabled={submitting || editingExpenseId === exp.id}>
                        <Edit2 size={16} />
                      </button>
                    </div>
                  );
                })}
                {recentExpenses.length === 0 && <p className="text-sm text-muted">No expenses submitted yet.</p>}
              </div>
            </div>
          </motion.form>
        )}

        {activeTab === 'ledger' && (
          <motion.div key="ledger" className="card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ padding: '1rem' }}>
            <h3 className="mb-4 text-gradient">Master Ledger (Read-only)</h3>
            <div className="overflow-x-hidden max-h-[600px] overflow-y-auto pr-2 pb-4">
              <div className="flex flex-col gap-3">
                {ledgerRows.map(log => (
                  <div key={log.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono text-muted">{formatDate(log.date)}</span>
                      {log.type === 'credit' ? <span className="badge badge-success px-2 py-0.5 text-xs">IN</span> : <span className="badge badge-danger px-2 py-0.5 text-xs">OUT</span>}
                    </div>
                    <div className="text-sm font-medium break-words leading-tight">{log.description}</div>
                    <div className="flex justify-between items-center mt-1 pt-2 border-t border-gray-100">
                      <div className="text-xs text-muted">
                        Amt: <span style={{ color: log.type === 'credit' ? '#10b981' : '#f43f5e', fontWeight: 'bold' }}>{log.type === 'credit' ? '+' : '-'}₹{Number(log.amount).toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-muted">
                        Bal: <span className="font-bold text-gray-800">₹{log.balance.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {ledgerRows.length === 0 && (
                  <p className="text-center py-8 text-muted text-sm">No transactions yet.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
