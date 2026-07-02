// All dates in the portal are displayed as DD/MM/YYYY, regardless of browser locale.
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const isWithinRange = (dateStr, from, to) => {
  if (!dateStr) return false;
  const d = new Date(dateStr).setHours(0, 0, 0, 0);
  if (from && d < new Date(from).setHours(0, 0, 0, 0)) return false;
  if (to && d > new Date(to).setHours(0, 0, 0, 0)) return false;
  return true;
};

export const MIN_RECORD_DATE = '2022-01-01';
