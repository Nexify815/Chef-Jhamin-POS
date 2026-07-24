import { useState, useEffect } from 'react';
import { useModal } from '../../components/Modal';
import api from '../../api';
import Pagination from '../../components/Pagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import FilterableHeader from '../../components/FilterableHeader';
import PageLoader from '../../components/PageLoader';

const PAGE_SIZE = 10;

const columns = [
  { key: 'ingredient', label: 'Ingredient', type: 'text' },
  { key: 'change_amount', label: 'Change Amount', type: 'number' },
  { key: 'type', label: 'Type', type: 'select' },
  { key: 'balance_after', label: 'Balance After', type: 'number' },
  { key: 'performed_by', label: 'Performed By', type: 'text' },
];

export default function InventoryLog() {
  const { showAlert } = useModal();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const normalizedLogs = logs.map(l => ({
    ...l,
    ingredient: l.ingredient || l.item || '',
    change_amount: Number(l.change_amount || l.qty || 0),
    type: Number(l.change_amount || l.qty || 0) >= 0 ? 'IN' : 'OUT',
    balance_after: l.balance_after ?? l.new_balance ?? '',
    performed_by: l.performed_by || l.staff || '',
  }));
  const { filters, setFilter, clearFilter, openFilter, setOpenFilter, filteredData, columnOptions, getFilterLabel } = useTableFilters(normalizedLogs, columns);

  const fetchLogs = (p) => {
    setLoading(true);
    api.get(`inventory-logs?limit=${PAGE_SIZE}&offset=${(p - 1) * PAGE_SIZE}`)
      .then(res => {
        if (Array.isArray(res)) {
          setLogs(res);
          setTotal(res.length === PAGE_SIZE ? (p * PAGE_SIZE) + 1 : p * PAGE_SIZE);
        } else {
          setLogs([]);
        }
      })
      .catch(() => showAlert('error', 'Error', 'Failed to load inventory logs.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(page); }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handlePageChange = (p) => {
    setPage(p);
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Inventory Audit Log</h1>

      <p className="text-sm text-gray-400">
        Showing <span className="text-white font-semibold">{filteredData.length}</span> records
      </p>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <FilterableHeader label="Ingredient" columnKey="ingredient" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Change Amount" columnKey="change_amount" type="number" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Type" columnKey="type" type="select" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Balance After" columnKey="balance_after" type="number" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <th>Notes</th>
                <FilterableHeader label="Performed By" columnKey="performed_by" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-gray-500 py-8">No inventory logs found.</td>
                </tr>
              ) : (
                filteredData.map((log, idx) => {
                  const changeAmt = Number(log.change_amount || log.qty || 0);
                  const isPositive = changeAmt >= 0;
                  return (
                    <tr key={log.id || idx}>
                      <td>{log.date || log.created_at || '—'}</td>
                      <td className="font-medium text-white">{log.ingredient || log.item || '—'}</td>
                      <td className={`font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{changeAmt}
                      </td>
                      <td>
                        <span className={isPositive ? 'badge-success' : 'badge-danger'}>
                          {isPositive ? 'IN' : 'OUT'}
                        </span>
                      </td>
                      <td className="font-semibold text-white">{log.balance_after ?? log.new_balance ?? '—'}</td>
                      <td>{log.notes || '—'}</td>
                      <td>{log.performed_by || log.staff || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
    </div>
  );
}
