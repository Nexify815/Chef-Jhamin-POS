import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../../api';
import { useModal } from '../../components/Modal';

const DATA_TYPES = [
  { value: 'sales', label: 'Sales', endpoint: 'export/sales' },
  { value: 'expenses', label: 'Expenses', endpoint: 'export/expenses' },
  { value: 'staff-logs', label: 'Staff Logs', endpoint: 'export/staff' },
  { value: 'ingredients', label: 'Ingredients', endpoint: 'export/ingredients' },
  { value: 'menu-items', label: 'Menu Items', endpoint: 'export/menu' },
  { value: 'recipes', label: 'Recipes', endpoint: 'export/recipes' },
  { value: 'extras', label: 'Extras', endpoint: 'export/extras' },
  { value: 'suppliers', label: 'Suppliers', endpoint: 'export/suppliers' },
  { value: 'customers', label: 'Customers', endpoint: 'export/customers' },
  { value: 'purchase-orders', label: 'Purchase Orders', endpoint: 'export/purchase-orders' },
];

const EXPECTED_COLUMNS = {
  sales: ['date', 'staff', 'item', 'size', 'qty', 'total', 'payment', 'customer_name', 'discount'],
  expenses: ['date', 'category', 'amount', 'description', 'payment'],
  'staff-logs': ['date', 'name', 'shift', 'timeIn', 'timeOut', 'hours', 'notes'],
  ingredients: ['name', 'unit', 'stock', 'reorder_level', 'cost_per_unit'],
  'menu-items': ['name', 'sizes', 'category', 'available'],
  recipes: ['menu_item_id', 'size', 'ingredient_id', 'quantity_needed'],
  extras: ['name', 'price'],
  suppliers: ['name', 'phone', 'email', 'notes'],
  customers: ['name', 'phone', 'email', 'address'],
  'purchase-orders': ['supplier_id', 'date', 'items', 'total', 'status', 'notes'],
};

const SAMPLE_ROWS = {
  sales: [
    { date: '2026-07-24', staff: 'Chef Jhamin', item: 'Jollof Rice', size: 'Big', qty: 2, total: 30, payment: 'Cash', customer_name: 'Kwame', discount: 0 },
    { date: '2026-07-24', staff: 'General Staff', item: 'Fried Rice', size: 'Small', qty: 1, total: 12, payment: 'MoMo', customer_name: '', discount: 0 },
  ],
  expenses: [
    { date: '2026-07-24', category: 'Rent', amount: 800, description: 'Monthly shop rent', payment: 'Cash' },
    { date: '2026-07-24', category: 'Utilities', amount: 50, description: 'Electricity bill', payment: 'MoMo' },
  ],
  'staff-logs': [
    { date: '2026-07-24', name: 'Chef Jhamin', shift: 'Morning', timeIn: '08:00', timeOut: '17:00', hours: 9, notes: 'Full shift' },
  ],
  ingredients: [
    { name: 'Rice', unit: 'Bags', stock: 10, reorder_level: 3, cost_per_unit: 250 },
    { name: 'Chicken', unit: 'Kg', stock: 5, reorder_level: 3, cost_per_unit: 45 },
  ],
  'menu-items': [
    { name: 'Jollof Rice', sizes: '{"Small":10,"Big":15}', category: 'Food', available: 1 },
  ],
  recipes: [
    { menu_item_id: 1, size: 'Big', ingredient_id: 1, quantity_needed: 0.5 },
  ],
  extras: [
    { name: 'Extra Chicken', price: 8 },
    { name: 'Shito', price: 2 },
  ],
  suppliers: [
    { name: 'Mama Abena Supplies', phone: '0241234567', email: '', notes: 'Rice supplier' },
  ],
  customers: [
    { name: 'Kwame Mensah', phone: '0249876543', email: '', address: 'Accra' },
  ],
  'purchase-orders': [
    { supplier_id: 1, date: '2026-07-24', items: '[{"name":"Rice","qty":5,"price":250}]', total: 1250, status: 'Pending', notes: 'Monthly order' },
  ],
};

function parseCSV(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      lines.push(current);
      current = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      lines.push(current);
      current = '';
      lines.push('__ROW__');
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);

  const result = [];
  let row = [];
  for (const item of lines) {
    if (item === '__ROW__') {
      if (row.length) result.push(row);
      row = [];
    } else {
      row.push(item);
    }
  }
  if (row.length) result.push(row);
  return result;
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportExport() {
  const { showAlert } = useModal();

  // ── Full Backup State ──
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const restoreRef = useRef(null);

  const handleFullBackup = async () => {
    setBackingUp(true);
    try {
      const res = await api.get('export/full-backup');
      const json = JSON.stringify(res, null, 2);
      const date = new Date().toISOString().slice(0, 10);
      downloadFile(json, `chef-jhamin-backup-${date}.json`, 'application/json');
      showAlert('success', 'Backup Complete', 'Full database backup downloaded as JSON file.');
    } catch (err) {
      showAlert('error', 'Backup Failed', err.message || 'Could not create backup.');
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreFile) return;
    setRestoring(true);
    try {
      const text = await restoreFile.text();
      const json = JSON.parse(text);
      if (!json.backup || !json.data) {
        showAlert('error', 'Invalid File', 'This does not appear to be a valid backup file.');
        setRestoring(false);
        return;
      }
      const res = await api.post('import/full-backup', json);
      if (res?.success === false) {
        showAlert('error', 'Restore Failed', res.message || 'Could not restore backup.');
      } else {
        showAlert('success', 'Restore Complete', 'Full backup restored successfully. The page will reload.', () => window.location.reload());
      }
    } catch (err) {
      showAlert('error', 'Restore Failed', err.message || 'Could not restore backup.');
    } finally {
      setRestoring(false);
    }
  };

  // ── Export State ──
  const [exportType, setExportType] = useState('sales');
  const [exportFormat, setExportFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const typeObj = DATA_TYPES.find(t => t.value === exportType);
      const res = await api.get(typeObj.endpoint);
      const data = Array.isArray(res) ? res : (res?.rows || res?.data || res?.items || []);
      if (!data.length) {
        showAlert('info', 'No Data', 'Nothing to export for this data type.');
        setExporting(false);
        return;
      }

      if (exportFormat === 'csv') {
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        data.forEach(row => {
          csvRows.push(headers.map(h => {
            const val = String(row[h] ?? '').replace(/"/g, '""');
            return `"${val}"`;
          }).join(','));
        });
        downloadFile(csvRows.join('\n'), `${exportType}.csv`, 'text/csv');
      } else {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, exportType);
        XLSX.writeFile(wb, `${exportType}.xlsx`);
      }

      showAlert('success', 'Exported', `File downloaded successfully as ${exportFormat.toUpperCase()}.`);
    } catch (err) {
      showAlert('error', 'Export Failed', err.message || 'Could not export data.');
    } finally {
      setExporting(false);
    }
  };

  // ── Template Download ──
  const handleDownloadTemplate = (type) => {
    const headers = EXPECTED_COLUMNS[type] || [];
    const sample = SAMPLE_ROWS[type] || [];
    if (exportFormat === 'csv') {
      const csvRows = [headers.join(',')];
      sample.forEach(row => {
        csvRows.push(headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
      });
      downloadFile(csvRows.join('\n'), `${type}-template.csv`, 'text/csv');
    } else {
      const ws = XLSX.utils.json_to_sheet(sample.length ? sample : [Object.fromEntries(headers.map(h => [h, '']))]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, type);
      XLSX.writeFile(wb, `${type}-template.xlsx`);
    }
    showAlert('success', 'Template Downloaded', `Open the file to see the expected columns and sample data for ${type}.`);
  };

  // ── Import State ──
  const [importType, setImportType] = useState('sales');
  const [file, setFile] = useState(null);
  const [rawRows, setRawRows] = useState([]);
  const [preview, setPreview] = useState([]);
  const [sourceHeaders, setSourceHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview([]);
    setSourceHeaders([]);
    setMapping({});
    setImportResult(null);

    const ext = f.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    if (ext === 'csv') {
      reader.onload = (ev) => {
        const rows = parseCSV(ev.target.result);
        if (rows.length < 2) return;
        const headers = rows[0];
        setSourceHeaders(headers);
        setRawRows(rows.slice(1).map(r => {
          const obj = {};
          headers.forEach((h, i) => obj[h] = r[i] || '');
          return obj;
        }));
        autoMap(headers);
      };
      reader.readAsText(f);
    } else if (ext === 'xlsx') {
      reader.onload = (ev) => {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rows.length < 2) return;
        const headers = rows[0].map(String);
        setSourceHeaders(headers);
        setRawRows(rows.slice(1).map(r => {
          const obj = {};
          headers.forEach((h, i) => obj[h] = r[i] !== undefined ? String(r[i]) : '');
          return obj;
        }));
        autoMap(headers);
      };
      reader.readAsArrayBuffer(f);
    }
  };

  const autoMap = (headers) => {
    const expected = EXPECTED_COLUMNS[importType] || [];
    const m = {};
    expected.forEach(e => {
      const match = headers.find(h => h.toLowerCase().trim() === e.toLowerCase().trim());
      if (match) m[e] = match;
    });
    setMapping(m);
  };

  const handlePreview = () => {
    setPreview(rawRows.slice(0, 10));
  };

  const handleImport = async () => {
    const expected = EXPECTED_COLUMNS[importType] || [];
    const mappedData = rawRows.map(row => {
      const obj = {};
      expected.forEach(e => {
        const src = mapping[e];
        obj[e] = src ? row[src] : '';
      });
      return obj;
    });

    setImporting(true);
    setImportResult(null);
    try {
      const res = await api.post('import', { table: importType, data: mappedData });
      if (res && res.success === false) {
        setImportResult({ success: false, message: res.message || 'Import failed.' });
      } else {
        setImportResult({ success: true, message: res?.message || `Successfully imported ${mappedData.length} rows.` });
        setFile(null);
        setRawRows([]);
        setPreview([]);
        setSourceHeaders([]);
        if (fileRef.current) fileRef.current.value = '';
      }
    } catch (err) {
      setImportResult({ success: false, message: err.message || 'Import failed.' });
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setRawRows([]);
    setPreview([]);
    setSourceHeaders([]);
    setMapping({});
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Import / Export</h1>

      {/* ── Full Backup Section ── */}
      <div className="glass-card p-6" style={{ border: '1px solid rgba(20,184,166,0.3)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.15)' }}>
            <i className="fas fa-database text-teal text-xl" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Full Database Backup</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Download or restore a complete snapshot of all data.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-page)', border: '1px solid var(--border-color)' }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}><i className="fas fa-download mr-2 text-teal" />Download Backup</h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Export all data as a JSON file.</p>
            <button onClick={handleFullBackup} disabled={backingUp} className="btn-primary px-5 py-2 text-sm disabled:opacity-50">
              {backingUp ? <><i className="fas fa-spinner fa-spin mr-2" />Backing up...</> : <><i className="fas fa-download mr-2" />Download</>}
            </button>
          </div>

          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-page)', border: '1px solid var(--border-color)' }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}><i className="fas fa-upload mr-2 text-amber-400" />Restore Backup</h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Upload a JSON backup to restore all data. <strong className="text-red-400">This replaces ALL current data.</strong></p>
            <div className="flex items-center gap-2">
              <input ref={restoreRef} type="file" accept=".json" onChange={e => setRestoreFile(e.target.files[0] || null)} className="input-field text-xs py-2 flex-1 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-medium file:cursor-pointer" style={{ color: 'var(--text-muted)' }} />
              <button onClick={handleRestoreBackup} disabled={!restoreFile || restoring} className="px-5 py-2 text-sm font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: 'rgba(245,158,11,0.15)', color: '#FBBF24', border: '1px solid rgba(245,158,11,0.3)' }}>
                {restoring ? <><i className="fas fa-spinner fa-spin mr-2" />Restoring...</> : <><i className="fas fa-upload mr-2" />Restore</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Export Section ── */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <i className="fas fa-file-export text-teal" />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Export Data</h2>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Data Type</label>
            <select value={exportType} onChange={e => setExportType(e.target.value)} className="input-field text-sm py-2.5">
              {DATA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Format</label>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setExportFormat('csv')}
                className="px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
                style={{
                  background: exportFormat === 'csv' ? 'rgba(20,184,166,0.15)' : 'transparent',
                  color: exportFormat === 'csv' ? 'var(--teal)' : 'var(--text-muted)',
                }}
              >CSV</button>
              <button
                onClick={() => setExportFormat('xlsx')}
                className="px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
                style={{
                  background: exportFormat === 'xlsx' ? 'rgba(20,184,166,0.15)' : 'transparent',
                  color: exportFormat === 'xlsx' ? 'var(--teal)' : 'var(--text-muted)',
                }}
              >XLSX</button>
            </div>
          </div>

          <button onClick={handleExport} disabled={exporting} className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50">
            {exporting ? <><i className="fas fa-spinner fa-spin mr-2" />Exporting...</> : <><i className="fas fa-download mr-2" />Export</>}
          </button>
        </div>
      </div>

      {/* ── Import Section ── */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <i className="fas fa-file-import text-teal" />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Import Data</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
              <button onClick={() => setExportFormat('csv')} className="px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer" style={{ background: exportFormat === 'csv' ? 'rgba(20,184,166,0.15)' : 'transparent', color: exportFormat === 'csv' ? 'var(--teal)' : 'var(--text-muted)' }}>CSV</button>
              <button onClick={() => setExportFormat('xlsx')} className="px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer" style={{ background: exportFormat === 'xlsx' ? 'rgba(20,184,166,0.15)' : 'transparent', color: exportFormat === 'xlsx' ? 'var(--teal)' : 'var(--text-muted)' }}>XLSX</button>
            </div>
            <button
              onClick={() => handleDownloadTemplate(importType)}
              className="text-xs px-4 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
              style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)', color: 'var(--teal)' }}
            >
              <i className={`fas fa-file-${exportFormat === 'csv' ? 'csv' : 'excel'}`} /> Download Template
            </button>
          </div>
        </div>

        <div className="p-3 rounded-xl mb-4 text-xs flex items-start gap-2" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#60A5FA' }}>
          <i className="fas fa-info-circle mt-0.5" />
          <span>Download the template file above to see the exact column names and sample data. Fill it in, then upload below. Your column names will be auto-matched.</span>
        </div>

        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Data Type</label>
            <select value={importType} onChange={e => { setImportType(e.target.value); resetImport(); }} className="input-field text-sm py-2.5">
              {DATA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">File (.csv or .xlsx)</label>
            <input ref={fileRef} type="file" accept=".csv,.xlsx" onChange={handleFileSelect} className="input-field text-sm py-2 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:cursor-pointer" style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>

        {sourceHeaders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-500">{rawRows.length} rows found. Preview first 10:</p>
              <button onClick={handlePreview} className="text-xs text-teal hover:underline cursor-pointer">Show Preview</button>
              <button onClick={resetImport} className="text-xs text-gray-500 hover:text-red-400 cursor-pointer">Clear</button>
            </div>

            {preview.length > 0 && (
              <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-color)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {sourceHeaders.map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        {sourceHeaders.map(h => (
                          <td key={h} className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{row[h] || '\u2014'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Column Mapping</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {(EXPECTED_COLUMNS[importType] || []).map(expected => (
                  <div key={expected} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-page)' }}>
                    <span className="text-xs font-medium flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{expected}</span>
                    <i className="fas fa-arrow-right text-[10px]" style={{ color: 'var(--text-dim)' }} />
                    <select
                      value={mapping[expected] || ''}
                      onChange={e => setMapping(prev => ({ ...prev, [expected]: e.target.value || undefined }))}
                      className="input-field text-xs py-1.5 w-40"
                    >
                      <option value="">\u2014 Skip \u2014</option>
                      {sourceHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleImport} disabled={importing} className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50">
              {importing ? <><i className="fas fa-spinner fa-spin mr-2" />Importing...</> : <><i className="fas fa-upload mr-2" />Import {rawRows.length} Rows</>}
            </button>
          </div>
        )}

        {importResult && (
          <div
            className="mt-4 p-4 rounded-xl text-sm flex items-start gap-3"
            style={{
              background: importResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${importResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: importResult.success ? '#34D399' : '#F87171',
            }}
          >
            <i className={`fas ${importResult.success ? 'fa-check-circle' : 'fa-times-circle'} mt-0.5`} />
            <span>{importResult.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
