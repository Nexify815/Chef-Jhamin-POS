import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../components/Modal';
import api from '../../api';
import PageLoader from '../../components/PageLoader';
import FactoryResetModal from '../../modals/FactoryResetModal';

export default function Settings() {
  const { settings, setSettings } = useAuth();
  const { showAlert, showConfirm, openModal, closeModal } = useModal();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [weeklyTarget, setWeeklyTarget] = useState('');
  const [expenseLimit, setExpenseLimit] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('settings')
      .then(res => {
        if (res) {
          setBusinessName(res.businessName || '');
          setWeeklyTarget(res.weeklyTarget || '');
          setExpenseLimit(res.expenseLimit || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dailyTarget = weeklyTarget ? (Number(weeklyTarget) / 7).toFixed(2) : '0.00';

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        businessName,
        weeklyTarget: Number(weeklyTarget) || 0,
        dailyTarget: Number(dailyTarget),
        expenseLimit: Number(expenseLimit) || 0,
      };
      await api.post('settings', payload);
      setSettings(payload);
      showAlert('success', 'Saved', 'Settings updated successfully.');
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const [clearing, setClearing] = useState(null);

  const dangerAction = async (type, endpoint) => {
    setClearing(type);
    try {
      const res = await api.post(endpoint);
      if (res && res.success === false) {
        showAlert('error', 'Error', res.message || 'Action failed.');
      } else {
        showAlert('success', 'Done', `${type.replace(/_/g, ' ')} cleared successfully.`);
      }
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Action failed.');
    } finally {
      setClearing(null);
    }
  };

  const handleClearSales = () => {
    showConfirm('Clear All Sales', 'Are you sure you want to delete ALL sales data? This cannot be undone.', () => {
      dangerAction('sales', 'danger/clear-sales');
    });
  };

  const handleClearExpenses = () => {
    showConfirm('Clear All Expenses', 'Are you sure you want to delete ALL expenses data? This cannot be undone.', () => {
      dangerAction('expenses', 'danger/clear-expenses');
    });
  };

  const handleClearStaffLogs = () => {
    showConfirm('Clear All Staff Logs', 'Are you sure you want to delete ALL staff log data? This cannot be undone.', () => {
      dangerAction('staff_logs', 'danger/clear-staff-logs');
    });
  };

  const handleFactoryReset = () => {
    showConfirm('Factory Reset', 'Are you sure? This will wipe ALL data and cannot be undone.', () => {
      openModal(
        <FactoryResetModal
          onConfirm={() => { closeModal(); dangerAction('factory_reset', 'danger/factory-reset'); }}
          onClose={closeModal}
        />
      );
    });
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <div className="glass-card p-6 max-w-xl">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              className="input-field"
              placeholder="Chef Jhamin's Kitchen"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Weekly Target (GHS)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={weeklyTarget}
              onChange={e => setWeeklyTarget(e.target.value)}
              className="input-field"
              placeholder="0.00"
            />
          </div>

          <div className="bg-white/[0.03] rounded-xl p-4 flex items-center justify-between border border-white/[0.06]">
            <span className="text-sm text-gray-400">Auto-calculated Daily Target</span>
            <span className="text-lg font-bold text-teal">GHS {dailyTarget}</span>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Expense Limit (GHS)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={expenseLimit}
              onChange={e => setExpenseLimit(e.target.value)}
              className="input-field"
              placeholder="0.00"
            />
          </div>

          <button type="submit" disabled={saving} className="btn-primary px-8 py-3 disabled:opacity-50">
            {saving ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-save mr-2" />Save Settings</>}
          </button>
        </form>
      </div>

      <div className="glass-card p-6 max-w-xl" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
        <div className="flex items-center gap-2 mb-4">
          <i className="fas fa-triangle-exclamation text-red-400" />
          <h2 className="text-lg font-bold text-red-400">Danger Zone</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">These actions are irreversible. Proceed with caution.</p>

        <div className="space-y-3">
          <button
            onClick={handleClearSales}
            disabled={clearing === 'sales'}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <span className="flex items-center gap-2 text-red-300">
              <i className="fas fa-trash-can" /> Clear All Sales
            </span>
            {clearing === 'sales' ? <i className="fas fa-spinner fa-spin text-red-400" /> : <i className="fas fa-chevron-right text-red-400/50" />}
          </button>

          <button
            onClick={handleClearExpenses}
            disabled={clearing === 'expenses'}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <span className="flex items-center gap-2 text-red-300">
              <i className="fas fa-trash-can" /> Clear All Expenses
            </span>
            {clearing === 'expenses' ? <i className="fas fa-spinner fa-spin text-red-400" /> : <i className="fas fa-chevron-right text-red-400/50" />}
          </button>

          <button
            onClick={handleClearStaffLogs}
            disabled={clearing === 'staff_logs'}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <span className="flex items-center gap-2 text-red-300">
              <i className="fas fa-trash-can" /> Clear All Staff Logs
            </span>
            {clearing === 'staff_logs' ? <i className="fas fa-spinner fa-spin text-red-400" /> : <i className="fas fa-chevron-right text-red-400/50" />}
          </button>

          <div className="pt-2" style={{ borderTop: '1px solid rgba(239,68,68,0.15)' }}>
            <button
              onClick={handleFactoryReset}
              disabled={clearing === 'factory_reset'}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)' }}
            >
              <span className="flex items-center gap-2 text-red-400">
                <i className="fas fa-bomb" /> Factory Reset
              </span>
              {clearing === 'factory_reset' ? <i className="fas fa-spinner fa-spin text-red-400" /> : <i className="fas fa-chevron-right text-red-400/50" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
