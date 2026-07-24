import { useState, useEffect } from 'react';
import { useModal } from '../../components/Modal';
import api from '../../api';
import EditStaffLogModal from '../../modals/EditStaffLogModal';
import Pagination from '../../components/Pagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import FilterableHeader from '../../components/FilterableHeader';
import useTableSelection from '../../hooks/useTableSelection';
import BulkActionsBar from '../../components/BulkActionsBar';
import PageLoader from '../../components/PageLoader';

const columns = [
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'shift', label: 'Shift', type: 'select' },
  { key: 'hours', label: 'Hours', type: 'number' },
];

export default function StaffLog() {
  const { showAlert, showConfirm } = useModal();
  const [logs, setLogs] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [editingLog, setEditingLog] = useState(null);
  const [page, setPage] = useState(1);
  const perPage = 10;
  const { filters, setFilter, clearFilter, openFilter, setOpenFilter, filteredData, columnOptions, getFilterLabel } = useTableFilters(logs.rows, columns);
  const { selectedIds, toggleSelection, toggleAll, clearSelection } = useTableSelection();

  const fetchLogs = () => {
    setLoading(true);
    api.get(`staff?limit=${perPage}&offset=${(page - 1) * perPage}`)
      .then(res => setLogs({ rows: res.rows || [], total: res.total || 0 }))
      .catch(() => showAlert('error', 'Error', 'Failed to load staff logs.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, [page]);

  const handleDelete = (log) => {
    showConfirm('Delete Log', `Delete staff log for ${log.name}?`, async () => {
      try {
        await api.delete(`staff/${log.id}`);
        fetchLogs();
      } catch (err) {
        showAlert('error', 'Error', err.message || 'Failed to delete staff log.');
      }
    });
  };

  const handleBulkDelete = async () => {
    try {
      await api.post('staff/bulk-delete', { ids: selectedIds });
      clearSelection();
      fetchLogs();
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to delete staff logs.');
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Staff Log</h1>

      <p className="text-sm text-gray-400">
        Showing <span className="text-white font-semibold">{filteredData.length}</span> records
      </p>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {selectedIds.length > 0 && <div className="px-4 pt-4"><BulkActionsBar count={selectedIds.length} onClear={clearSelection} onDelete={handleBulkDelete} label="logs" /></div>}
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40, paddingLeft: 16 }}>
                  <input type="checkbox" className="table-checkbox" checked={filteredData.length > 0 && filteredData.every(l => selectedIds.includes(l.id))} onChange={() => toggleAll(filteredData.map(l => l.id))} />
                </th>
                <FilterableHeader label="Date" columnKey="date" type="date" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Name" columnKey="name" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Shift" columnKey="shift" type="select" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <th>Time In</th>
                <th>Time Out</th>
                <FilterableHeader label="Hours" columnKey="hours" type="number" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center text-gray-500 py-8">No records found.</td>
                </tr>
              ) : (
                filteredData.map(log => (
                  <tr key={log.id} className={selectedIds.includes(log.id) ? 'bg-teal/5' : ''}>
                    <td style={{ paddingLeft: 16 }}>
                      <input type="checkbox" className="table-checkbox" checked={selectedIds.includes(log.id)} onChange={() => toggleSelection(log.id)} />
                    </td>
                    <td>{log.date}</td>
                    <td className="font-medium text-white">{log.name}</td>
                    <td>{log.shift || '—'}</td>
                    <td>{log.timeIn || '—'}</td>
                    <td>{log.timeOut || '—'}</td>
                    <td className="font-semibold text-teal">{log.hours || '—'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingLog(log)} className="text-blue-400 hover:text-blue-300 text-sm cursor-pointer">
                          <i className="fas fa-pen-to-square" />
                        </button>
                        <button onClick={() => handleDelete(log)} className="text-red-400 hover:text-red-300 text-sm cursor-pointer">
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={Math.ceil((logs.total || 0) / perPage)} onPageChange={setPage} />

      {editingLog && <EditStaffLogModal log={editingLog} onClose={() => setEditingLog(null)} onSaved={() => { setEditingLog(null); fetchLogs(); }} />}
    </div>
  );
}
