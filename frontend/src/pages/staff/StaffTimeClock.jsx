import { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import { useModal } from '../../components/Modal';
import ClockModal from '../../modals/ClockModal';
import { useTableFilters } from '../../hooks/useTableFilters';
import FilterableHeader from '../../components/FilterableHeader';
import PageLoader from '../../components/PageLoader';
import { today } from '../../utils/helpers';

const columns = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'shift', label: 'Shift', type: 'text' },
  { key: 'hours', label: 'Hours', type: 'number' },
];

export default function StaffTimeClock() {
  const { openModal, closeModal } = useModal();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('staff');
      const todayStr = today();
      const allLogs = res?.rows || (Array.isArray(res) ? res : []);
      const todayLogs = allLogs.filter(log => log.date === todayStr);
      setLogs(todayLogs);
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { filters, setFilter, clearFilter, openFilter, setOpenFilter, filteredData, columnOptions, getFilterLabel } = useTableFilters(logs, columns);

  const openClockIn = () =>
    openModal(<ClockModal mode="in" onClose={() => { closeModal(); fetchData(); }} />);

  const openClockOut = () =>
    openModal(<ClockModal mode="out" onClose={() => { closeModal(); fetchData(); }} />);

  const fmtTime = (t) => {
    if (!t) return '-';
    return t;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Time Clock</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
        <button onClick={openClockIn} className="glass-card p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition hover:bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <i className="fa-solid fa-clock text-emerald-400 text-3xl" />
          </div>
          <div className="text-emerald-400 font-bold text-xl">Clock In</div>
          <div className="text-gray-400 text-sm">Start your shift</div>
        </button>

        <button onClick={openClockOut} className="glass-card p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition hover:bg-orange-500/10 border border-orange-500/20">
          <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center">
            <i className="fa-solid fa-right-from-bracket text-orange-400 text-3xl" />
          </div>
          <div className="text-orange-400 font-bold text-xl">Clock Out</div>
          <div className="text-gray-400 text-sm">End your shift</div>
        </button>
      </div>

      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Today's Time Logs</h2>
        {loading ? (
          <PageLoader text="Loading..." />
        ) : logs.length === 0 ? (
          <p className="text-gray-400 text-sm">No time logs today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-white/10">
                  <FilterableHeader label="Name" columnKey="name" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                  <FilterableHeader label="Shift" columnKey="shift" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                  <th className="text-left py-2 px-3">Time In</th>
                  <th className="text-left py-2 px-3">Time Out</th>
                  <FilterableHeader label="Hours" columnKey="hours" type="number" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                </tr>
              </thead>
              <tbody>
                {filteredData.map((log) => (
                  <tr key={log.id} className="border-b border-white/5 text-gray-300">
                    <td className="py-2 px-3">{log.name}</td>
                    <td className="py-2 px-3">{log.shift || '-'}</td>
                    <td className="py-2 px-3">{fmtTime(log.timeIn)}</td>
                    <td className="py-2 px-3">{fmtTime(log.timeOut)}</td>
                    <td className="py-2 px-3 text-right font-medium text-white">
                      {log.hours || '-'}
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
