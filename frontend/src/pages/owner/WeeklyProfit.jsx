import { useState } from 'react';
import { useModal } from '../../components/Modal';
import api from '../../api';

export default function WeeklyProfit() {
  const { showAlert } = useModal();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1);
    return d.toISOString().split('T')[0];
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    if (!startDate) {
      showAlert('warning', 'Required', 'Please select a start date.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`reports/weekly?start=${startDate}`);
      setData(res);
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to fetch weekly report.');
    } finally {
      setLoading(false);
    }
  };

  const endDate = (() => {
    if (!startDate) return '';
    const d = new Date(startDate);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  })();

  const totalSales = Number(data?.sales) || 0;
  const totalExpenses = Number(data?.expenses) || 0;
  const foodCost = Number(data?.foodCost) || 0;
  const netProfit = totalSales - totalExpenses - foodCost;
  const ownerShare = netProfit * 0.6;
  const partnerShare = netProfit * 0.3;
  const savingsShare = netProfit * 0.1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Weekly Profit</h1>

      <div className="glass-card p-5">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs text-gray-400 mb-1">Week Start Date (Monday)</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field text-sm w-full" />
          </div>
          {startDate && (
            <p className="text-sm text-gray-500 pb-1">
              Week: <span className="text-white">{startDate}</span> to <span className="text-white">{endDate}</span>
            </p>
          )}
          <button onClick={handleCalculate} disabled={loading} className="btn-primary text-sm px-6 py-3 whitespace-nowrap disabled:opacity-50">
            {loading ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-calculator mr-2" />Calculate</>}
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="glass-card p-5 text-center">
              <i className="fas fa-coins text-2xl text-emerald-400 mb-2 block" />
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Sales</p>
              <p className="text-2xl font-bold text-emerald-400">GHS {totalSales.toFixed(2)}</p>
            </div>
            <div className="glass-card p-5 text-center">
              <i className="fas fa-receipt text-2xl text-red-400 mb-2 block" />
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-red-400">GHS {totalExpenses.toFixed(2)}</p>
            </div>
            <div className="glass-card p-5 text-center">
              <i className="fas fa-utensils text-2xl text-amber-400 mb-2 block" />
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Food Cost</p>
              <p className="text-2xl font-bold text-amber-400">GHS {foodCost.toFixed(2)}</p>
            </div>
            <div className="glass-card p-5 text-center">
              <i className="fas fa-chart-line text-2xl text-teal mb-2 block" />
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Net Profit</p>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-teal' : 'text-red-400'}`}>
                GHS {netProfit.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Profit Split</h3>
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
        </>
      )}

      {!data && !loading && (
        <div className="glass-card p-12 text-center text-gray-500">
          <i className="fas fa-calendar-week text-4xl text-gray-600/50 mb-3 block" />
          Select a week start date and click Calculate to view the weekly profit report.
        </div>
      )}
    </div>
  );
}
