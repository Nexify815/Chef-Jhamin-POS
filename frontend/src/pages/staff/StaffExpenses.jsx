import { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import { useModal } from '../../components/Modal';
import CustomSelect from '../../components/CustomSelect';
import { useTableFilters } from '../../hooks/useTableFilters';
import FilterableHeader from '../../components/FilterableHeader';
import PageLoader from '../../components/PageLoader';
import { today, fmt, EXPENSE_CATEGORIES } from '../../utils/helpers';

const columns = [
  { key: 'category', label: 'Category', type: 'select' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'payment', label: 'Payment', type: 'select' },
  { key: 'amount', label: 'Amount', type: 'number' },
];

const defaultForm = () => ({
  date: today(),
  category: '',
  amount: '',
  description: '',
  payment: 'Cash',
});

export default function StaffExpenses() {
  const { showAlert } = useModal();
  const [form, setForm] = useState(defaultForm());
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('expenses');
      const todayStr = today();
      const allExpenses = Array.isArray(res) ? res : (res?.rows || []);
      setExpenses(allExpenses.filter((e) => e.date?.slice(0, 10) === todayStr).reverse());
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('expenses', {
        date: form.date,
        category: form.category,
        amount: Number(form.amount),
        description: form.description,
        payment: form.payment,
      });
      setForm(defaultForm());
      fetchData();
    } catch (e) {
      showAlert('error', 'Error', e.message || 'Failed to record expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const { filters, setFilter, clearFilter, openFilter, setOpenFilter, filteredData, columnOptions, getFilterLabel } = useTableFilters(expenses, columns);

  const dailyTotal = expenses.reduce((a, e) => a + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Expenses</h1>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Date</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} className="input-field w-full" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Category</label>
            <CustomSelect
              value={form.category}
              onChange={(val) => setForm(prev => ({ ...prev, category: val }))}
              options={EXPENSE_CATEGORIES}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Amount (GHS)</label>
            <input type="number" name="amount" value={form.amount} onChange={handleChange} min="0" step="0.01" className="input-field w-full" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Payment</label>
            <CustomSelect
              value={form.payment}
              onChange={(val) => setForm({...form, payment: val})}
              options={['Cash', 'MoMo', 'Bolt Food', 'Delivery']}
              placeholder="Select payment"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <input type="text" name="description" value={form.description} onChange={handleChange} className="input-field w-full" placeholder="Brief description..." />
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Recording...' : 'Record Expense'}
          </button>
          <div className="ml-auto text-lg font-bold text-white">Daily Total: GHS {fmt(dailyTotal)}</div>
        </div>
      </form>

      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Today's Expenses</h2>
        {loading ? (
          <PageLoader text="Loading..." />
        ) : expenses.length === 0 ? (
          <p className="text-gray-400 text-sm">No expenses today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-white/10">
                  <FilterableHeader label="Category" columnKey="category" type="select" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                  <FilterableHeader label="Description" columnKey="description" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                  <FilterableHeader label="Payment" columnKey="payment" type="select" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                  <FilterableHeader label="Amount" columnKey="amount" type="number" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                </tr>
              </thead>
              <tbody>
                {filteredData.map((exp) => (
                  <tr key={exp.id} className="border-b border-white/5 text-gray-300">
                    <td className="py-2 px-3">{exp.category}</td>
                    <td className="py-2 px-3">{exp.description || '-'}</td>
                    <td className="py-2 px-3">
                      <span className={`badge-${exp.payment === 'Cash' ? 'success' : 'warning'}`}>
                        {exp.payment}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-white">GHS {fmt(exp.amount)}</td>
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
