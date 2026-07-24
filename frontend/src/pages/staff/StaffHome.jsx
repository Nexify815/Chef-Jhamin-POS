import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { useModal } from '../../components/Modal';
import ClockModal from '../../modals/ClockModal';
import { useTableFilters } from '../../hooks/useTableFilters';
import FilterableHeader from '../../components/FilterableHeader';
import PageLoader from '../../components/PageLoader';
import { today, fmt } from '../../utils/helpers';

const columns = [
  { key: 'item', label: 'Item', type: 'text' },
  { key: 'size', label: 'Size', type: 'text' },
  { key: 'qty', label: 'Qty', type: 'number' },
  { key: 'total', label: 'Total', type: 'number' },
  { key: 'payment', label: 'Payment', type: 'select' },
];

export default function StaffHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openModal, closeModal } = useModal();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalSales: 0, ordersCount: 0, totalExpenses: 0 });
  const [recentSales, setRecentSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [clockStatus, setClockStatus] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, salesRes, invRes, clockRes] = await Promise.all([
        api.get('reports/dashboard'),
        api.get(`sales?date=${today()}`),
        api.get('ingredients'),
        api.get('clock-status'),
      ]);

      const todayStr = today();
      const allSales = Array.isArray(salesRes) ? salesRes : (salesRes?.rows || []);
      const todaySales = allSales.filter((s) => s.date?.slice(0, 10) === todayStr);

      setSummary({
        totalSales: todaySales.reduce((a, s) => a + Number(s.total), 0),
        ordersCount: todaySales.length,
        totalExpenses: Number(dashRes?.expenses?.total || 0),
      });
      setRecentSales(todaySales.slice(-10).reverse());

      const inv = Array.isArray(invRes) ? invRes : [];
      setLowStock(inv.filter((item) => item.reorder_level && item.stock <= item.reorder_level));
      setClockStatus(clockRes);
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openClockIn = () =>
    openModal(<ClockModal mode="in" onClose={() => { closeModal(); fetchData(); }} />);

  const openClockOut = () =>
    openModal(<ClockModal mode="out" onClose={() => { closeModal(); fetchData(); }} />);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const { filters, setFilter, clearFilter, openFilter, setOpenFilter, filteredData, columnOptions, getFilterLabel } = useTableFilters(recentSales, columns);

  if (loading) {
    return <PageLoader text="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome, {user?.name}</h1>
          <p className="text-gray-400 text-sm">{dateStr}</p>
        </div>
        <div className="flex items-center gap-3">
          {clockStatus && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
              clockStatus.clockedIn
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-gray-500/15 text-gray-400 border border-gray-500/30'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${clockStatus.clockedIn ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
              {clockStatus.clockedIn
                ? `Clocked In · ${clockStatus.timeIn} · ${clockStatus.shift}`
                : clockStatus.timeOut
                  ? `Clocked Out · ${clockStatus.hours}h worked today`
                  : 'Not Clocked In'}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={openClockIn} className="btn-primary flex items-center gap-2">
              <i className="fa-solid fa-clock" /> Clock In
            </button>
            <button onClick={openClockOut} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-all cursor-pointer text-sm font-medium">
              <i className="fa-solid fa-right-from-bracket" /> Clock Out
            </button>
          </div>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="glass-card border border-amber-500/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <i className="fa-solid fa-triangle-exclamation text-amber-400" />
            <span className="text-amber-300 font-semibold">Low Stock Alert</span>
          </div>
          <div className="text-sm text-gray-300">
            {lowStock.map((item) => (
              <span key={item.id} className="inline-block bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded mr-2 mb-1">
                {item.name}: {item.stock} {item.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 text-center">
          <div className="text-gray-400 text-sm mb-1">Today's Sales</div>
          <div className="text-2xl font-bold text-emerald-400">GHS {fmt(summary.totalSales)}</div>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="text-gray-400 text-sm mb-1">Orders Count</div>
          <div className="text-2xl font-bold text-blue-400">{summary.ordersCount}</div>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="text-gray-400 text-sm mb-1">Today's Expenses</div>
          <div className="text-2xl font-bold text-red-400">GHS {fmt(summary.totalExpenses)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button onClick={() => navigate('/staff/sales')} className="glass-card p-5 text-left hover:bg-teal/[0.05] transition cursor-pointer">
          <i className="fa-solid fa-cash-register text-emerald-400 text-xl mb-2" />
          <div className="text-white font-semibold">Record Sale</div>
          <div className="text-gray-400 text-xs">Add a new sale entry</div>
        </button>
        <button onClick={() => navigate('/staff/expenses')} className="glass-card p-5 text-left hover:bg-teal/[0.05] transition cursor-pointer">
          <i className="fa-solid fa-receipt text-orange-400 text-xl mb-2" />
          <div className="text-white font-semibold">Add Expense</div>
          <div className="text-gray-400 text-xs">Log an expense</div>
        </button>
        <button onClick={() => navigate('/staff/inventory')} className="glass-card p-5 text-left hover:bg-teal/[0.05] transition cursor-pointer">
          <i className="fa-solid fa-boxes-stacked text-blue-400 text-xl mb-2" />
          <div className="text-white font-semibold">Inventory</div>
          <div className="text-gray-400 text-xs">View & update stock</div>
        </button>
      </div>

      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Today's Recent Sales</h2>
        {recentSales.length === 0 ? (
          <p className="text-gray-400 text-sm">No sales recorded today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-white/10">
                  <FilterableHeader label="Item" columnKey="item" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                  <FilterableHeader label="Size" columnKey="size" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                  <FilterableHeader label="Qty" columnKey="qty" type="number" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                  <FilterableHeader label="Total" columnKey="total" type="number" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                  <FilterableHeader label="Payment" columnKey="payment" type="select" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                </tr>
              </thead>
              <tbody>
                {filteredData.map((sale) => (
                  <tr key={sale.id} className="border-b border-white/5 text-gray-300">
                    <td className="py-2 px-3">{sale.item}</td>
                    <td className="py-2 px-3">{sale.size || '-'}</td>
                    <td className="py-2 px-3 text-center">{sale.qty}</td>
                    <td className="py-2 px-3 text-right font-medium text-white">GHS {fmt(sale.total)}</td>
                    <td className="py-2 px-3">
                      <span className={`badge-${sale.payment === 'Cash' ? 'success' : 'warning'}`}>
                        {sale.payment}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
