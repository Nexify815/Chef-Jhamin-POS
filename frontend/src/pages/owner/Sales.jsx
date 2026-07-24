import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../components/Modal';
import api from '../../api';
import EditSaleModal from '../../modals/EditSaleModal';
import Pagination from '../../components/Pagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import FilterableHeader from '../../components/FilterableHeader';
import useTableSelection from '../../hooks/useTableSelection';
import BulkActionsBar from '../../components/BulkActionsBar';
import PageLoader from '../../components/PageLoader';
import { parseExtras } from '../../utils/helpers';

const columns = [
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'staff', label: 'Staff', type: 'text' },
  { key: 'item', label: 'Item', type: 'text' },
  { key: 'size', label: 'Size', type: 'text' },
  { key: 'qty', label: 'Qty', type: 'number' },
  { key: 'total', label: 'Total', type: 'number' },
  { key: 'payment', label: 'Payment', type: 'select' },
  { key: 'customer_name', label: 'Customer', type: 'text' },
];

export default function Sales() {
  const { user, extras } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const [allSales, setAllSales] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [editingSale, setEditingSale] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const { filters, setFilter, clearFilter, openFilter, setOpenFilter, filteredData, columnOptions, getFilterLabel } = useTableFilters(allSales.rows, columns);
  const { selectedIds, toggleSelection, toggleAll, clearSelection } = useTableSelection();

  const fetchSales = () => {
    setLoading(true);
    api.get(`sales?limit=${perPage}&offset=${(page - 1) * perPage}${showDeleted ? '&includeDeleted=1' : ''}`)
      .then(res => setAllSales({ rows: res.rows || [], total: res.total || 0 }))
      .catch(() => showAlert('error', 'Error', 'Failed to load sales.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSales(); }, [showDeleted, page]);

  const handleDelete = (sale) => {
    showConfirm('Delete Sale', `Delete this sale of GHS ${Number(sale.total).toFixed(2)}?`, async () => {
      try {
        await api.delete(`sales/${sale.id}`);
        fetchSales();
      } catch (err) {
        showAlert('error', 'Error', err.message || 'Failed to delete sale.');
      }
    });
  };

  const handleRestore = (sale) => {
    showConfirm('Restore Sale', `Restore this deleted sale?`, async () => {
      try {
        await api.put(`sales/${sale.id}/restore`);
        fetchSales();
        showAlert('success', 'Restored', 'Sale restored successfully.');
      } catch (err) {
        showAlert('error', 'Error', err.message || 'Failed to restore sale.');
      }
    });
  };

  const formatTime = (ts) => {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  };

  const filteredTotal = filteredData.reduce((sum, s) => sum + Number(s.total || 0), 0);

  const handleBulkDelete = async () => {
    try {
      await api.post('sales/bulk-delete', { ids: selectedIds });
      clearSelection();
      fetchSales();
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to delete sales.');
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">All Sales</h1>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-400">
            Showing <span className="text-white font-semibold">{filteredData.length}</span> sales
          </p>
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              showDeleted
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-white/[0.04] border-white/[0.08] text-gray-500 hover:text-gray-300'
            }`}
          >
            <i className={`fas ${showDeleted ? 'fa-eye' : 'fa-eye-slash'} mr-1.5`} />
            {showDeleted ? 'Showing Deleted' : 'Show Deleted'}
          </button>
        </div>
        <p className="text-sm text-gray-400">
          Total: <span className="text-teal font-bold">GHS {filteredTotal.toFixed(2)}</span>
        </p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {selectedIds.length > 0 && <div className="px-4 pt-4"><BulkActionsBar count={selectedIds.length} onClear={clearSelection} onDelete={handleBulkDelete} label="sales" /></div>}
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40, paddingLeft: 16 }}>
                  <input type="checkbox" className="table-checkbox" checked={filteredData.length > 0 && filteredData.every(s => s.deleted !== 1 && selectedIds.includes(s.id))} onChange={() => toggleAll(filteredData.filter(s => s.deleted !== 1).map(s => s.id))} />
                </th>
                <FilterableHeader label="Date" columnKey="date" type="date" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <th>Time</th>
                <FilterableHeader label="Staff" columnKey="staff" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Item" columnKey="item" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Size" columnKey="size" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Qty" columnKey="qty" type="number" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <th>Extras</th>
                <FilterableHeader label="Total" columnKey="total" type="number" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Payment" columnKey="payment" type="select" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Customer" columnKey="customer_name" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="12" className="text-center text-gray-500 py-8">No sales found.</td>
                </tr>
              ) : (
                filteredData.map(sale => (
                  <tr key={sale.id} className={`${sale.deleted === 1 ? 'opacity-50' : ''} ${selectedIds.includes(sale.id) ? 'bg-teal/5' : ''}`}>
                    {sale.deleted !== 1 ? (
                      <td style={{ paddingLeft: 16 }}>
                        <input type="checkbox" className="table-checkbox" checked={selectedIds.includes(sale.id)} onChange={() => toggleSelection(sale.id)} />
                      </td>
                    ) : <td style={{ paddingLeft: 16 }} />}
                    <td>
                      <span className={sale.deleted === 1 ? 'line-through text-gray-500' : ''}>{sale.date}</span>
                      {sale.deleted === 1 && <span className="ml-2 badge-danger text-[9px]">Deleted</span>}
                    </td>
                    <td>{formatTime(sale.timestamp)}</td>
                    <td className={sale.deleted === 1 ? 'line-through text-gray-500' : ''}>{sale.staff}</td>
                    <td className={sale.deleted === 1 ? 'line-through text-gray-500' : ''}>{sale.item}</td>
                    <td>{sale.size}</td>
                    <td>{sale.qty}</td>
                    <td>{sale.extraItem ? (() => {
                      const parsed = parseExtras(sale.extraItem, sale.extraCost, extras);
                      if (parsed.length === 0) return '—';
                      if (parsed.length === 1) return `${parsed[0].name} x${parsed[0].qty}`;
                      return <span className="text-xs">{parsed.map(e => `${e.name} x${e.qty}`).join(', ')}</span>;
                    })() : '—'}</td>
                    <td className="font-semibold text-teal">GHS {Number(sale.total).toFixed(2)}</td>
                    <td>
                      <span className={
                        sale.payment === 'Cash' ? 'badge-success' :
                        sale.payment === 'MoMo' ? 'badge-warning' :
                        'badge-danger'
                      }>
                        {sale.payment}
                      </span>
                    </td>
                    <td>{sale.customer_name || '-'}</td>
                    <td>
                      {sale.deleted !== 1 ? (
                        <div className="flex gap-2">
                          <button onClick={() => setEditingSale(sale)} className="text-blue-400 hover:text-blue-300 text-sm cursor-pointer">
                            <i className="fas fa-pen-to-square" />
                          </button>
                          <button onClick={() => handleDelete(sale)} className="text-red-400 hover:text-red-300 text-sm cursor-pointer">
                            <i className="fas fa-trash" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          {showDeleted && sale.deleted === 1 && (
                            <button onClick={() => handleRestore(sale)} className="text-emerald-400 hover:text-emerald-300 text-sm cursor-pointer ml-2" title="Restore">
                              <i className="fas fa-trash-can-arrow-up" />
                            </button>
                          )}
                          {!showDeleted && <span className="text-gray-600 text-xs italic">No actions</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={Math.ceil((allSales.total || 0) / perPage)} onPageChange={setPage} />

      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
          onSaved={() => { setEditingSale(null); fetchSales(); }}
        />
      )}
    </div>
  );
}
