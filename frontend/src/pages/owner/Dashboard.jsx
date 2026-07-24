import { useState, useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import StatCard from '../../components/StatCard';
import { useTableFilters } from '../../hooks/useTableFilters';
import FilterableHeader from '../../components/FilterableHeader';
import PageLoader from '../../components/PageLoader';

const staffColumns = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'shift', label: 'Shift', type: 'text' },
];

const tabs = [
  { id: 'overview', label: 'Overview', icon: 'fas fa-chart-pie' },
  { id: 'activity', label: 'Activity', icon: 'fas fa-clock' },
];

function Collapsible({ title, icon, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef(null);
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 cursor-pointer bg-transparent border-none text-left"
        style={{ fontFamily: 'inherit' }}
      >
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          {icon && <i className={icon} />}
          {title}
        </h3>
        <i className="fas fa-chevron-down text-gray-500 text-xs" style={{ transition: 'transform 0.3s ease', transform: open ? 'rotate(180deg)' : 'rotate(0)' }} />
      </button>
      <div
        ref={contentRef}
        className={`collapsible-body ${open ? 'expanded' : 'collapsed'}`}
        style={{ maxHeight: open ? `${contentRef.current?.scrollHeight || 500}px` : '0px' }}
      >
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { settings } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const { filters, setFilter, clearFilter, openFilter, setOpenFilter, filteredData, columnOptions, getFilterLabel } = useTableFilters(data?.staffActivity || [], staffColumns);

  useEffect(() => {
    api.get('reports/dashboard')
      .then(res => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (chartRef.current && data?.chartData?.length) {
      if (chartInstance.current) chartInstance.current.destroy();

      const labels = data.chartData.map(d => d.date);
      const salesValues = data.chartData.map(d => d.total || 0);
      const expenseValues = data.chartData.map(d => d.expenses || 0);

      chartInstance.current = new Chart(chartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Sales',
              data: salesValues,
              backgroundColor: 'rgba(20, 184, 166, 0.6)',
              borderColor: '#14B8A6',
              borderWidth: 1,
              borderRadius: 4,
            },
            {
              label: 'Expenses',
              data: expenseValues,
              backgroundColor: 'rgba(239, 68, 68, 0.45)',
              borderColor: '#EF4444',
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#8A93A6', font: { size: 12 } } },
          },
          scales: {
            x: {
              ticks: { color: '#6B7385', font: { size: 10 } },
              grid: { color: 'rgba(255,255,255,0.03)' },
            },
            y: {
              ticks: { color: '#6B7385', font: { size: 10 } },
              grid: { color: 'rgba(255,255,255,0.03)' },
            },
          },
        },
      });
    }
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [data, activeTab]);

  if (loading) {
    return <PageLoader />;
  }

  if (!data) {
    return (
      <div className="glass-card p-8 text-center text-gray-400">
        <i className="fas fa-exclamation-triangle text-3xl text-yellow-500/50 mb-3 block" />
        Failed to load dashboard data.
      </div>
    );
  }

  const dailyTarget = Number(settings?.dailyTarget) || 0;
  const todaySales = Number(data.sales?.total) || 0;
  const todayExpenses = Number(data.expenses?.total) || 0;
  const todayProfit = todaySales - todayExpenses;
  const dailyProgress = dailyTarget > 0 ? Math.min((todaySales / dailyTarget) * 100, 100) : 0;
  const isOnTarget = todaySales >= dailyTarget;

  const weeklyTarget = Number(settings?.weeklyTarget) || 0;
  const weeklySales = Number(data.weekly?.total) || 0;
  const weeklyProgress = weeklyTarget > 0 ? Math.min((weeklySales / weeklyTarget) * 100, 100) : 0;

  const paymentBreakdown = {};
  if (data.payments?.length) {
    data.payments.forEach(p => { paymentBreakdown[p.payment] = Number(p.total) || 0; });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-teal to-teal-deep text-white'
                : 'bg-white/[0.04] text-gray-500 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <i className={tab.icon} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="fas fa-coins" label="Today's Sales" value={`GHS ${todaySales.toFixed(2)}`} color="gold" index={0} />
            <StatCard icon="fas fa-receipt" label="Today's Expenses" value={`GHS ${todayExpenses.toFixed(2)}`} color="red" index={1} />
            <StatCard icon="fas fa-chart-line" label={todayProfit < 0 ? "Total Loss" : "Today's Profit"} value={`GHS ${todayProfit.toFixed(2)}`} color={todayProfit < 0 ? "red" : "green"} index={2} />
            <StatCard icon="fas fa-box-open" label="Low Stock Items" value={Number(data.lowStock?.count) || 0} color="orange" index={3} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Collapsible title="Daily Target" icon="fas fa-bullseye" defaultOpen={true}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-teal font-bold text-lg">GHS {todaySales.toFixed(2)}</span>
                <span className="text-xs text-gray-500">of GHS {dailyTarget.toFixed(2)}</span>
              </div>
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isOnTarget ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-orange-400'}`}
                  style={{ width: `${dailyProgress}%` }}
                />
              </div>
              <span className={`text-xs font-semibold ${isOnTarget ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isOnTarget ? 'ON TARGET' : 'BELOW TARGET'} — {dailyProgress.toFixed(1)}%
              </span>
            </Collapsible>

            <Collapsible title="Weekly Progress" icon="fas fa-calendar-check" defaultOpen={true}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-teal font-bold text-lg">GHS {weeklySales.toFixed(2)}</span>
                <span className="text-xs text-gray-500">of GHS {weeklyTarget.toFixed(2)}</span>
              </div>
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal to-teal-deep transition-all duration-500"
                  style={{ width: `${weeklyProgress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{weeklyProgress.toFixed(1)}% achieved</span>
            </Collapsible>
          </div>

          <Collapsible title="Payment Breakdown" icon="fas fa-wallet" defaultOpen={false}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Cash', icon: 'fas fa-money-bill-wave', value: paymentBreakdown?.Cash || 0, color: 'text-emerald-400' },
                { label: 'MoMo', icon: 'fas fa-mobile-screen', value: paymentBreakdown?.MoMo || 0, color: 'text-blue-400' },
                { label: 'Bolt Food', icon: 'fas fa-motorcycle', value: paymentBreakdown?.['Bolt Food'] || 0, color: 'text-purple-400' },
                { label: 'Delivery', icon: 'fas fa-truck', value: paymentBreakdown?.Delivery || 0, color: 'text-amber-400' },
              ].map((p) => (
                <div key={p.label} className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/[0.04]">
                  <i className={`${p.icon} text-xl ${p.color} mb-2 block`} />
                  <p className="text-xs text-gray-500 mb-1">{p.label}</p>
                  <p className={`text-lg font-bold ${p.color}`}>GHS {Number(p.value).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </Collapsible>

          <Collapsible title="Sales vs Expenses (Last 7 Days)" icon="fas fa-chart-bar" defaultOpen={true}>
            <div style={{ height: '250px', minHeight: '200px', position: 'relative' }}>
              <canvas ref={chartRef} />
            </div>
          </Collapsible>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-6">
          {data.staffActivity?.length > 0 ? (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <FilterableHeader label="Name" columnKey="name" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                      <FilterableHeader label="Shift" columnKey="shift" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                      <th>Time In</th>
                      <th>Time Out</th>
                      <th>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((s, i) => (
                      <tr key={i}>
                        <td>{s.name}</td>
                        <td>{s.shift}</td>
                        <td>{s.timeIn || '—'}</td>
                        <td>{s.timeOut || '—'}</td>
                        <td>{s.hours || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="glass-card p-8 text-center text-gray-400">
              <i className="fas fa-calendar-xmark text-2xl text-gray-600 mb-3 block" />
              No staff activity today.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
