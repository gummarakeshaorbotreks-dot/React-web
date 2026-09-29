export const sentenceCase = (text = '') =>
  text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : '';

export const formatPrice = (value) =>
  `₹${Number(value).toLocaleString('en-IN')}`;

// The list API sends a number of days, the detail API sometimes a label
// like "6 Days" — show both the same way.
export const formatDuration = (value) => {
  if (value == null || value === '') return '';
  if (/^\d+$/.test(String(value))) {
    const days = Number(value);
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  return String(value);
};

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
