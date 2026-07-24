export const today = () => new Date().toISOString().slice(0, 10);

export const fmt = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const parseExtras = (extraItem, extraCost, extrasList) => {
  if (!extraItem) return [];
  try {
    const parsed = JSON.parse(extraItem);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  const found = extrasList.find((e) => e.name === extraItem);
  const price = found ? Number(found.price) : 0;
  const qty = price > 0 ? Math.round(Number(extraCost || 0) / price) : 1;
  return [{ name: extraItem, qty }];
};

export const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Ingredients', 'Staff', 'Supplies', 'Maintenance', 'Transport', 'Other'];
