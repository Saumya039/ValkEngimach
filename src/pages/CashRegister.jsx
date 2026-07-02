import { useState, useEffect } from 'react';
import { getCashIn, getExpenses, addCashIn } from '../services/db';
import { Plus, ArrowDownRight, ArrowUpRight, DollarSign, Download, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportToCsv } from '../utils/exportCsv';
import { exportToPdf } from '../utils/exportPdf';
import { formatDate, isWithinRange, MIN_RECORD_DATE } from '../utils/dateFormat';
import DateRangeFilter from '../components/DateRangeFilter';

export default function CashRegister() {
  const [cashInLogs, setCashInLogs] = useState([]);
  const [expenseLogs, setExpenseLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Admin Cash In Form state
  const [cashDate, setCashDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Cash from Company');
  const [description, setDescription] = useState('');
  const [remarks, setRemarks] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    const cash = await getCashIn() || [];
    const exp = await getExpenses() || [];
    setCashInLogs(cash);
    setExpenseLogs(exp);
    setLoading(false);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addCashIn({
      date: cashDate,
      amount: Number(amount),
      category,
      description,
      remarks
    });
    setAmount('');
    setDescription('');
    setRemarks('');
    setCashDate(new Date().toISOString().split('T')[0]);
    setShowForm(false);
    fetchLogs();
  };

  const handleExport = () => {
    exportToCsv('master_ledger.csv', visibleLedger.map(l => ({
      date: formatDate(l.date), type: l.type, category: l.category, description: l.description,
      amount: l.amount, balance: l.balance
    })));
  };

  const handleExportPdf = () => {
    exportToPdf('master_ledger.pdf', 'Master Ledger', ['Date', 'Type', 'Category', 'Description', 'Amount', 'Balance'],
      visibleLedger.map(l => [formatDate(l.date), l.type === 'credit' ? 'IN' : 'OUT', l.category, l.description, `Rs ${Number(l.amount).toLocaleString()}`, `Rs ${l.balance.toLocaleString()}`]));
  };

  // Combine and sort logs for the master ledger
  const allLogs = [...cashInLogs, ...expenseLogs].sort((a, b) => new Date(a.date) - new Date(b.date));

  let runningBalance = 0;
  let cumulativeExpense = 0;
  const ledger = allLogs.map(log => {
    if (log.type === 'credit') {
      runningBalance += Number(log.amount);
    } else {
      runningBalance -= Number(log.amount);
      cumulativeExpense += Number(log.amount);
    }
    return { ...log, balance: runningBalance, cumulativeExpense };
  });

  // Reverse to show newest first
  ledger.reverse();

  const visibleLedger = (dateFrom || dateTo) ? ledger.filter(l => isWithinRange(l.date, dateFrom, dateTo)) : ledger;

  return (
    <div>
      <div className="flex justify-between items-center mb-8" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="text-gradient">Master Ledger</h2>
          <p className="text-muted">Combined view of Cash In & Expenses</p>
        </div>
        <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
          <button className="btn btn-outline" onClick={handleExport}>
            <Download size={16} /> CSV
          </button>
          <button className="btn btn-outline" onClick={handleExportPdf}>
            <FileText size={16} /> PDF
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Log Cash In
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8"
          >
            <form className="card" onSubmit={handleSubmit}>
              <h3 className="mb-4 text-gradient flex items-center gap-2"><ArrowDownRight size={18} color="#10b981" /> Add Cash to System</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="input-group">
                  <label>Date</label>
                  <input type="date" className="input" min={MIN_RECORD_DATE} value={cashDate} onChange={(e) => setCashDate(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label>Amount (₹)</label>
                  <input type="number" className="input font-mono font-bold" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
              </div>
              <div className="input-group mb-4">
                <label>Category</label>
                <select className="select" value={category} onChange={(e) => setCategory(e.target.value)} required>
                  <option value="Cash from Company">Cash from Company</option>
                  <option value="Customer">Customer</option>
                  <option value="Scrap">Scrap</option>
                  <option value="Supplier">Supplier</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="input-group mb-4">
                <label>Description</label>
                <input type="text" className="input" placeholder="e.g. from TEFLON Machining" value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>
              <div className="input-group mb-6">
                <label>Remarks / Reference</label>
                <input type="text" className="input" placeholder="e.g. Cash Register Old Entry" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>
              <div className="flex gap-4">
                <button type="submit" className="btn btn-primary flex-1">Save Entry</button>
                <button type="button" className="btn btn-outline flex-1" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Description</th>
                <th>Remarks/Op</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'right' }}>Cum. Expense</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="text-center py-8">Loading ledger...</td></tr>
              ) : visibleLedger.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-8 text-muted">No transactions in this range.</td></tr>
              ) : (
                visibleLedger.map((log) => (
                  <tr key={log.id}>
                    <td className="font-mono text-sm">{formatDate(log.date)}</td>
                    <td>
                      {log.type === 'credit' 
                        ? <span className="badge badge-success flex items-center gap-1 w-max"><ArrowDownRight size={12}/> IN</span>
                        : <span className="badge badge-danger flex items-center gap-1 w-max"><ArrowUpRight size={12}/> OUT</span>
                      }
                    </td>
                    <td>{log.category}</td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.description}</td>
                    <td className="text-muted text-sm">{log.type === 'credit' ? log.remarks : `Op: ${log.operatorName}`}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: log.type === 'credit' ? '#10b981' : '#f43f5e' }}>
                      {log.type === 'credit' ? '+' : '-'}₹{Number(log.amount).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono text-muted">
                      ₹{log.cumulativeExpense.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }} className="font-mono text-gradient">
                      ₹{log.balance.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
