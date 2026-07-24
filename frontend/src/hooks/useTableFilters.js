import { useState, useMemo, useCallback } from 'react';

export function useTableFilters(data, columns) {
  const [filters, setFilters] = useState({});
  const [openFilter, setOpenFilter] = useState(null);

  const setFilter = useCallback((key, value) => {
    setFilters(prev => {
      if (value === '' || value === null || value === undefined) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const clearFilter = useCallback((key) => {
    setFilters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => setFilters({}), []);

  const activeCount = Object.keys(filters).length;

  const columnOptions = useMemo(() => {
    const opts = {};
    columns.forEach(col => {
      if (col.type === 'select' && col.key) {
        const unique = [...new Set(data.map(row => row[col.key]).filter(v => v !== null && v !== undefined && v !== ''))].sort();
        opts[col.key] = unique;
      }
    });
    return opts;
  }, [data, columns]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      return Object.entries(filters).every(([key, filterValue]) => {
        if (!filterValue && filterValue !== 0) return true;
        const col = columns.find(c => c.key === key);
        const cellValue = row[key];

        if (col?.type === 'select') {
          return String(cellValue) === String(filterValue);
        }
        if (col?.type === 'number') {
          const { min, max } = typeof filterValue === 'object' ? filterValue : {};
          const num = Number(cellValue);
          if (min !== undefined && min !== '' && num < Number(min)) return false;
          if (max !== undefined && max !== '' && num > Number(max)) return false;
          return true;
        }
        if (col?.type === 'date') {
          const { from, to } = typeof filterValue === 'object' ? filterValue : {};
          const dateStr = String(cellValue);
          if (from && dateStr < from) return false;
          if (to && dateStr > to) return false;
          return true;
        }
        const str = String(cellValue || '').toLowerCase();
        const search = String(filterValue).toLowerCase();
        return str.includes(search);
      });
    });
  }, [data, filters, columns]);

  const getFilterLabel = useCallback((key) => {
    const val = filters[key];
    if (val === undefined || val === null) return null;
    if (typeof val === 'object') {
      const parts = [];
      if (val.min !== undefined && val.min !== '') parts.push(`>= ${val.min}`);
      if (val.max !== undefined && val.max !== '') parts.push(`<= ${val.max}`);
      if (val.from) parts.push(`>= ${val.from}`);
      if (val.to) parts.push(`<= ${val.to}`);
      return parts.join(', ') || null;
    }
    return String(val);
  }, [filters]);

  return { filters, setFilter, clearFilter, clearAllFilters, openFilter, setOpenFilter, filteredData, columnOptions, activeCount, getFilterLabel };
}

export default useTableFilters;
