import { useEffect, useRef } from 'react';

export default function FilterableHeader({ label, columnKey, type, filters, setFilter, clearFilter, openFilter, setOpenFilter, columnOptions, getFilterLabel }) {
  const ref = useRef(null);
  const isOpen = openFilter === columnKey;
  const activeLabel = getFilterLabel(columnKey);

  useEffect(() => {
    if (!isOpen) return;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpenFilter(null);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isOpen, setOpenFilter]);

  const filterType = type || 'text';

  return (
    <th ref={ref} className="relative" style={{ cursor: 'default' }}>
      <div className="flex items-center gap-1.5 select-none">
        <span>{label}</span>
        <button
          onClick={(e) => { e.stopPropagation(); setOpenFilter(isOpen ? null : columnKey); }}
          className="filter-toggle"
          style={{ color: activeLabel ? 'var(--teal-light)' : 'var(--text-dim)', fontSize: '10px', padding: '2px 4px', borderRadius: '4px', background: activeLabel ? 'rgba(20,184,166,0.12)' : 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}
        >
          <i className={`fas ${activeLabel ? 'fa-filter' : 'fa-sliders'}`} />
        </button>
      </div>

      {isOpen && (
        <div className="filter-dropdown" onClick={(e) => e.stopPropagation()}>
          {filterType === 'select' && (
            <div className="filter-dropdown-inner">
              <select
                value={filters[columnKey] || ''}
                onChange={(e) => { setFilter(columnKey, e.target.value || null); }}
                className="input-field text-xs"
                style={{ padding: '6px 8px' }}
              >
                <option value="">All</option>
                {(columnOptions[columnKey] || []).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}

          {filterType === 'number' && (
            <div className="filter-dropdown-inner">
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters[columnKey]?.min || ''}
                  onChange={(e) => setFilter(columnKey, { ...(filters[columnKey] || {}), min: e.target.value })}
                  className="input-field text-xs"
                  style={{ padding: '6px 8px' }}
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters[columnKey]?.max || ''}
                  onChange={(e) => setFilter(columnKey, { ...(filters[columnKey] || {}), max: e.target.value })}
                  className="input-field text-xs"
                  style={{ padding: '6px 8px' }}
                />
              </div>
            </div>
          )}

          {filterType === 'date' && (
            <div className="filter-dropdown-inner">
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters[columnKey]?.from || ''}
                  onChange={(e) => setFilter(columnKey, { ...(filters[columnKey] || {}), from: e.target.value })}
                  className="input-field text-xs"
                  style={{ padding: '6px 8px' }}
                />
                <input
                  type="date"
                  value={filters[columnKey]?.to || ''}
                  onChange={(e) => setFilter(columnKey, { ...(filters[columnKey] || {}), to: e.target.value })}
                  className="input-field text-xs"
                  style={{ padding: '6px 8px' }}
                />
              </div>
            </div>
          )}

          {filterType === 'text' && (
            <div className="filter-dropdown-inner">
              <input
                type="text"
                placeholder="Search..."
                value={filters[columnKey] || ''}
                onChange={(e) => setFilter(columnKey, e.target.value || null)}
                className="input-field text-xs"
                style={{ padding: '6px 8px' }}
                autoFocus
              />
            </div>
          )}

          {activeLabel && (
            <button
              onClick={() => { clearFilter(columnKey); setOpenFilter(null); }}
              className="filter-clear-btn"
            >
              <i className="fas fa-times mr-1" />Clear
            </button>
          )}
        </div>
      )}
    </th>
  );
}
