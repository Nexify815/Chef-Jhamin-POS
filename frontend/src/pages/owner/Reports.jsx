import { useState } from 'react';
import { useModal } from '../../components/Modal';
import api from '../../api';

export default function Reports() {
  const { showAlert } = useModal();

  // Daily
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyData, setDailyData] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);

  // Weekly
  const [weeklyStart, setWeeklyStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1);
    return d.toISOString().split('T')[0];
  });
  const [weeklyData, setWeeklyData] = useState(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  const fetchDaily = async () => {
    if (!dailyDate) {
      showAlert('warning', 'Required', 'Please select a date.');
      return;
    }
    setDailyLoading(true);
    try {
      const res = await api.get(`dashboard?date=${dailyDate}`);
      setDailyData(res);
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to fetch daily report.');
    } finally {
      setDailyLoading(false);
    }
  };

  const fetchWeekly = async () => {
    if (!weeklyStart) {
      showAlert('warning', 'Required', 'Please select a start date.');
      return;
    }
    setWeeklyLoading(true);
    try {
      const res = await api.get(`reports/weekly?start=${weeklyStart}`);
      setWeeklyData(res);
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to fetch weekly report.');
    } finally {
      setWeeklyLoading(false);
    }
  };

  const renderStatCard = (icon, label, value, colorClass) => (
    <div className="glass-card p-5 text-center">
      <i className={`fas ${icon} text-2xl ${colorClass} mb-2 block`} />
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>GHS {Number(value).toFixed(2)}</p>
    </div>
  );

  const renderProfitSplit = (netProfit) => {
    const ownerShare = netProfit * 0.6;
    const partnerShare = netProfit * 0.3;
    const savingsShare = netProfit * 0.1;
    return (
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Profit Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/[0.03] rounded-xl p-5 text-center border border-white/[0.06]">
            <p className="text-xs text-gray-500 mb-1">Owner (60%)</p>
            <p className="text-xl font-bold text-teal">GHS {ownerShare.toFixed(2)}</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-5 text-center border border-white/[0.06]">
            <p className="text-xs text-gray-500 mb-1">Partner (30%)</p>
            <p className="text-xl font-bold text-blue-400">GHS {partnerShare.toFixed(2)}</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-5 text-center border border-white/[0.06]">
            <p className="text-xs text-gray-500 mb-1">Savings (10%)</p>
            <p className="text-xl font-bold text-emerald-400">GHS {savingsShare.toFixed(2)}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Reports</h1>

      {/* Daily Report */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-teal uppercase tracking-wider mb-4">
          <i className="fas fa-calendar-day mr-2" />Daily Report
        </h3>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={dailyDate}
              onChange={e => setDailyDate(e.target.value)}
              className="input-field text-sm w-full"
            />
          </div>
          <button
            onClick={fetchDaily}
            disabled={dailyLoading}
            className="btn-primary text-sm px-6 py-3 whitespace-nowrap disabled:opacity-50"
          >
            {dailyLoading ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-search mr-2" />Fetch</>}
          </button>
        </div>
      </div>

      {dailyData && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {renderStatCard('fa-coins', 'Total Sales', dailyData.sales ?? dailyData.total_sales ?? 0, 'text-emerald-400')}
            {renderStatCard('fa-receipt', 'Total Expenses', dailyData.expenses ?? dailyData.total_expenses ?? 0, 'text-red-400')}
            {renderStatCard('fa-chart-line', 'Net Profit', (dailyData.sales ?? dailyData.total_sales ?? 0) - (dailyData.expenses ?? dailyData.total_expenses ?? 0), 'text-teal')}
            {renderStatCard('fa-utensils', 'Food Cost', dailyData.food_cost ?? dailyData.cost_per_unit ?? 0, 'text-amber-400')}
          </div>
          {renderProfitSplit((dailyData.sales ?? dailyData.total_sales ?? 0) - (dailyData.expenses ?? dailyData.total_expenses ?? 0))}
        </>
      )}

      {!dailyData && !dailyLoading && (
        <div className="glass-card p-12 text-center text-gray-500">
          <i className="fas fa-calendar-day text-4xl text-gray-600/50 mb-3 block" />
          Select a date and click Fetch to view the daily report.
        </div>
      )}

      {/* Weekly Report */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-teal uppercase tracking-wider mb-4">
          <i className="fas fa-calendar-week mr-2" />Weekly Report
        </h3>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs text-gray-400 mb-1">Week Start (Monday)</label>
            <input
              type="date"
              value={weeklyStart}
              onChange={e => setWeeklyStart(e.target.value)}
              className="input-field text-sm w-full"
            />
          </div>
          <button
            onClick={fetchWeekly}
            disabled={weeklyLoading}
            className="btn-primary text-sm px-6 py-3 whitespace-nowrap disabled:opacity-50"
          >
            {weeklyLoading ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-calculator mr-2" />Calculate</>}
          </button>
        </div>
      </div>

      {weeklyData && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {renderStatCard('fa-coins', 'Total Sales', weeklyData.sales ?? weeklyData.total_sales ?? 0, 'text-emerald-400')}
            {renderStatCard('fa-receipt', 'Total Expenses', weeklyData.expenses ?? weeklyData.total_expenses ?? 0, 'text-red-400')}
            {renderStatCard('fa-chart-line', 'Net Profit', (weeklyData.sales ?? weeklyData.total_sales ?? 0) - (weeklyData.expenses ?? weeklyData.total_expenses ?? 0), 'text-teal')}
            {renderStatCard('fa-utensils', 'Food Cost', weeklyData.food_cost ?? weeklyData.cost_per_unit ?? 0, 'text-amber-400')}
          </div>
          {renderProfitSplit((weeklyData.sales ?? weeklyData.total_sales ?? 0) - (weeklyData.expenses ?? weeklyData.total_expenses ?? 0))}
        </>
      )}

      {!weeklyData && !weeklyLoading && (
        <div className="glass-card p-12 text-center text-gray-500">
          <i className="fas fa-calendar-week text-4xl text-gray-600/50 mb-3 block" />
          Select a week start date and click Calculate to view the weekly report.
        </div>
      )}
    </div>
  );
}
