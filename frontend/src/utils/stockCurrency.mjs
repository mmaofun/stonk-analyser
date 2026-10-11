export const money = (value, currency = 'USD') => Number.isFinite(value)
  ? new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value) : 'Unavailable'
