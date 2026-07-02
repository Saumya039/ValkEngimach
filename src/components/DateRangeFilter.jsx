import { MIN_RECORD_DATE } from '../utils/dateFormat';

export default function DateRangeFilter({ from, to, onFromChange, onToChange }) {
  const hasFilter = from || to;
  return (
    <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
      <div className="input-group" style={{ marginBottom: 0 }}>
        <label style={{ fontSize: '0.7rem' }}>From</label>
        <input type="date" className="input" min={MIN_RECORD_DATE} value={from} onChange={(e) => onFromChange(e.target.value)} />
      </div>
      <div className="input-group" style={{ marginBottom: 0 }}>
        <label style={{ fontSize: '0.7rem' }}>To</label>
        <input type="date" className="input" min={MIN_RECORD_DATE} value={to} onChange={(e) => onToChange(e.target.value)} />
      </div>
      {hasFilter && (
        <button type="button" className="btn btn-outline text-sm" style={{ marginTop: '1.3rem' }} onClick={() => { onFromChange(''); onToChange(''); }}>
          Clear
        </button>
      )}
    </div>
  );
}
