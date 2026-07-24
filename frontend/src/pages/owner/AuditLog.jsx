import { useState, useEffect, useCallback, Fragment } from 'react';
import api from '../../api';
import PageLoader from '../../components/PageLoader';

const ACTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'DANGER_CLEAR', 'DANGER_FACTORY_RESET'];
const TABLES = [
  '', 'sales', 'expenses', 'staff_logs', 'menu_items', 'ingredients',
  'users', 'extras', 'recipes', 'suppliers', 'customers', 'purchase_orders',
];

const actionColor = (action) => {
  if (action === 'CREATE') return 'text-emerald-400 bg-emerald-400/10';
  if (action === 'UPDATE') return 'text-amber-400 bg-amber-400/10';
  if (action?.startsWith('DELETE')) return 'text-red-400 bg-red-400/10';
  if (action?.startsWith('DANGER_')) return 'text-red-400 bg-red-400/10';
  return 'text-gray-400 bg-gray-400/10';
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const [filters, setFilters] = useState({
    action: '', table_name: '', performed_by: '', search: '', from: '', to: '',
  });
  const [page, setPage] = useState(0);
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.action) params.set('action', filters.action);
    if (filters.table_name) params.set('table_name', filters.table_name);
    if (filters.performed_by) params.set('performed_by', filters.performed_by);
    if (filters.search) params.set('search', filters.search);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    params.set('limit', limit);
    params.set('offset', page * limit);

    try {
      const res = await api.get(`audit-log?${params.toString()}`);
      if (res && res.success !== false) {
        setRows(res.rows || res.data || res.logs || res || []);
        setTotal(res.total || 0);
      } else {
        setRows([]);
        setTotal(0);
      }
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const setFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({ action: '', table_name: '', performed_by: '', search: '', from: '', to: '' });
    setPage(0);
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const handleExport = async () => {
    try {
      const res = await api.get('export/audit-log');
      const data = res?.rows || res?.data || res?.logs || res || [];
      if (!data.length) return;
      const headers = ['time', 'action', 'table_name', 'record_id', 'record_summary', 'performed_by'];
      const csvRows = [headers.join(',')];
      data.forEach(row => {
        csvRows.push(headers.map(h => {
          const val = String(row[h] ?? '').replace(/"/g, '""');
          return `"${val}"`;
        }).join(','));
      });
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-log.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
        <button onClick={handleExport} className="btn-primary px-5 py-2.5 text-sm">
          <i className="fas fa-download mr-2" />Export CSV
        </button>
      </div>

      <div className="glass-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" value={filters.from} onChange={e => setFilter('from', e.target.value)} className="input-field text-sm py-2" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" value={filters.to} onChange={e => setFilter('to', e.target.value)} className="input-field text-sm py-2" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Action</label>
            <select value={filters.action} onChange={e => setFilter('action', e.target.value)} className="input-field text-sm py-2">
              {ACTIONS.map(a => <option key={a} value={a}>{a || 'All'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Module</label>
            <select value={filters.table_name} onChange={e => setFilter('table_name', e.target.value)} className="input-field text-sm py-2">
              {TABLES.map(t => <option key={t} value={t}>{t || 'All'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Performed By</label>
            <input type="text" value={filters.performed_by} onChange={e => setFilter('performed_by', e.target.value)} placeholder="e.g. Admin" className="input-field text-sm py-2" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input type="text" value={filters.search} onChange={e => setFilter('search', e.target.value)} placeholder="Keyword..." className="input-field text-sm py-2" />
          </div>
        </div>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="mt-3 text-xs text-gray-500 hover:text-white transition-colors cursor-pointer flex items-center gap-1">
            <i className="fas fa-times" /> Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <PageLoader text="Loading audit logs..." />
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Record ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">By</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      <i className="fas fa-inbox text-2xl mb-2 block opacity-40" /> No audit logs found.
                    </td>
                  </tr>
                ) : rows.map((row, i) => {
                  const isOpen = expanded === i;
                  return (
                    <Fragment key={row.id || i}>
                      <tr
                        className="transition-colors cursor-pointer"
                        style={{ borderBottom: '1px solid var(--border-color)' }}
                        onClick={() => setExpanded(isOpen ? null : i)}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--table-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                          {formatDate(row.created_at || row.time)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${actionColor(row.action)}`}>
                            {row.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                          {row.table_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
                          {row.record_id || '—'}
                        </td>
                        <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: 'var(--text-secondary)' }}>
                          {row.record_summary || '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                          {row.performed_by || '—'}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`detail-${row.id || i}`}>
                          <td colSpan={6} className="px-6 py-4" style={{ background: 'var(--bg-page)' }}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Before (old_values)</h4>
                                <pre className="text-xs p-3 rounded-xl overflow-x-auto max-h-48" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                                  {row.old_values ? JSON.stringify(row.old_values, null, 2) : '—'}
                                </pre>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">After (new_values)</h4>
                                <pre className="text-xs p-3 rounded-xl overflow-x-auto max-h-48" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                                  {row.new_values ? JSON.stringify(row.new_values, null, 2) : '—'}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {total > limit && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border-color)' }}>
              <span className="text-xs text-gray-500">Page {page + 1} of {totalPages} ({total} results)</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 disabled:opacity-30 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 disabled:opacity-30 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
