import { useState, useEffect } from 'react';
import api from '../../api';
import { useModal } from '../../components/Modal';
import { useTableFilters } from '../../hooks/useTableFilters';
import FilterableHeader from '../../components/FilterableHeader';
import PageLoader from '../../components/PageLoader';

const columns = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'message', label: 'Message', type: 'text' },
];

export default function LowStock() {
  const [notifications, setNotifications] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useModal();
  const { filters, setFilter, clearFilter, openFilter, setOpenFilter, filteredData, columnOptions, getFilterLabel } = useTableFilters(notifications, columns);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [notifs, ings] = await Promise.all([
        api.get('notifications'),
        api.get('ingredients'),
      ]);
      setNotifications(notifs || []);
      setIngredients(ings || []);
    } catch (e) {
      console.error('Failed to fetch data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const lowStockItems = ingredients.filter(i => Number(i.stock) <= Number(i.reorder_level));

  const markAsRead = async (id) => {
    try {
      await api.put(`notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (e) {
      showAlert('error', 'Error', 'Failed to mark as read.');
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      showAlert('success', 'Done', 'All notifications marked as read.');
    } catch (e) {
      showAlert('error', 'Error', 'Failed to mark all as read.');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      showAlert('error', 'Error', 'Failed to delete notification.');
    }
  };

  const clearAll = async () => {
    try {
      await api.delete('notifications/clear-all');
      setNotifications([]);
      showAlert('success', 'Done', 'All notifications cleared.');
    } catch (e) {
      showAlert('error', 'Error', 'Failed to clear notifications.');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Low Stock Alerts</h1>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.is_read) && (
            <button onClick={markAllRead} className="text-sm text-teal hover:text-teal-deep transition-colors cursor-pointer">
              <i className="fas fa-check-double mr-1.5" />Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll} className="text-sm text-red-400 hover:text-red-300 transition-colors cursor-pointer">
              <i className="fas fa-trash mr-1.5" />Clear all
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lowStockItems.map(item => {
          const stock = Number(item.stock);
          const reorder = Number(item.reorder_level);
          const pct = reorder > 0 ? Math.max(0, (stock / reorder) * 100) : 0;
          return (
            <div key={item.id} className="glass-card p-5 border border-orange-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
                  <i className="fas fa-box-open text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                  <p className="text-[11px] text-gray-500">{item.unit}</p>
                </div>
                <span className="badge-danger text-xs">LOW</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Current Stock</span>
                  <span className="text-red-400 font-semibold">{stock} {item.unit}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Reorder Level</span>
                  <span className="text-gray-300">{reorder} {item.unit}</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-600 text-right">{pct.toFixed(0)}% of reorder level</p>
              </div>
            </div>
          );
        })}
        {lowStockItems.length === 0 && (
          <div className="col-span-full glass-card p-12 text-center">
            <i className="fas fa-check-circle text-3xl text-emerald-400/50 mb-3 block" />
            <p className="text-gray-400">All items are well stocked!</p>
          </div>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Notification History ({filteredData.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <FilterableHeader label="Title" columnKey="title" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Message" columnKey="message" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-gray-500 py-8">No notifications yet.</td>
                </tr>
              ) : (
                filteredData.map(n => (
                  <tr key={n.id} className={!n.is_read ? 'bg-teal/[0.02]' : ''}>
                    <td>
                      {!n.is_read ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-teal inline-block" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-600 inline-block" />
                      )}
                    </td>
                    <td className={`font-medium ${!n.is_read ? 'text-white' : 'text-gray-400'}`}>{n.title}</td>
                    <td className="text-gray-400 text-sm max-w-xs truncate">{n.message}</td>
                    <td className="text-gray-500 text-xs whitespace-nowrap">{formatTime(n.created_at)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {!n.is_read && (
                          <button
                            onClick={() => markAsRead(n.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-teal hover:bg-teal/10 transition-all cursor-pointer"
                            title="Mark as read"
                          >
                            <i className="fas fa-check text-xs" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(n.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                          title="Delete"
                        >
                          <i className="fas fa-trash text-xs" />
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
    </div>
  );
}
