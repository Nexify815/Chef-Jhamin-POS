import { useState, useEffect } from 'react';
import { useModal } from '../../components/Modal';
import api from '../../api';
import CustomSelect from '../../components/CustomSelect';
import EditExpenseModal from '../../modals/EditExpenseModal';
import Pagination from '../../components/Pagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import FilterableHeader from '../../components/FilterableHeader';
import useTableSelection from '../../hooks/useTableSelection';
import BulkActionsBar from '../../components/BulkActionsBar';
import PageLoader from '../../components/PageLoader';
import { EXPENSE_CATEGORIES } from '../../utils/helpers';

const columns = [
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'category', label: 'Category', type: 'select' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'payment', label: 'Payment', type: 'select' },
  { key: 'amount', label: 'Amount', type: 'number' },
];

export default function Expenses() {
  const { showAlert, showConfirm } = useModal();
  const [expenses, setExpenses] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const { filters, setFilter, clearFilter, openFilter, setOpenFilter, filteredData, columnOptions, getFilterLabel } = useTableFilters(expenses.rows, columns);
  const { selectedIds, toggleSelection, toggleAll, clearSelection } = useTableSelection();

  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newCategory, setNewCategory] = useState('Ingredients');
  const [newAmount, setNewAmount] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPayment, setNewPayment] = useState('Cash');

  const fetchExpenses = () => {
    setLoading(true);
    api.get(`expenses?limit=${perPage}&offset=${(page - 1) * perPage}`)
      .then(res => setExpenses({ rows: res.rows || [], total: res.total || 0 }))
      .catch(() => showAlert('error', 'Error', 'Failed to load expenses.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchExpenses(); }, [page]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!newAmount || Number(newAmount) <= 0) {
      showAlert('warning', 'Invalid', 'Please enter a valid amount.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('expenses', {
        date: newDate,
        category: newCategory,
        amount: Number(newAmount),
        description: newDescription,
        payment: newPayment,
      });
      setNewAmount('');
      setNewDescription('');
      fetchExpenses();
      showAlert('success', 'Added', 'Expense recorded successfully.');
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to add expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (expense) => {
    showConfirm('Delete Expense', `Delete this GHS ${Number(expense.amount).toFixed(2)} expense?`, async () => {
      try {
        await api.delete(`expenses/${expense.id}`);
        fetchExpenses();
      } catch (err) {
        showAlert('error', 'Error', err.message || 'Failed to delete expense.');
      }
    });
  };

  const filteredTotal = filteredData.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const handleBulkDelete = async () => {
    try {
      await api.post('expenses/bulk-delete', { ids: selectedIds });
      clearSelection();
      fetchExpenses();
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to delete expenses.');
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">All Expenses</h1>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-teal uppercase tracking-wider mb-4">
          <i className="fas fa-plus-circle mr-2" />Add Expense
        </h3>
        <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Date</label>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="input-field text-sm" required />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Category</label>
            <CustomSelect
              value={newCategory}
              onChange={setNewCategory}
              options={EXPENSE_CATEGORIES}
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Amount (GHS)</label>
            <input type="number" step="0.01" min="0" value={newAmount} onChange={e => setNewAmount(e.target.value)} className="input-field text-sm" placeholder="0.00" required />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description</label>
            <input type="text" value={newDescription} onChange={e => setNewDescription(e.target.value)} className="input-field text-sm" placeholder="Optional description" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Payment Method</label>
            <CustomSelect value={newPayment} onChange={setNewPayment} options={['Cash', 'MoMo', 'Bolt Food', 'Delivery']} placeholder="Select payment" />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={submitting} className="btn-primary text-sm px-6 py-3 w-full disabled:opacity-50">
              {submitting ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-plus mr-2" />Add</>}
            </button>
          </div>
        </form>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Showing <span className="text-white font-semibold">{filteredData.length}</span> expenses
        </p>
        <p className="text-sm text-gray-400">
          Total: <span className="text-red-400 font-bold">GHS {filteredTotal.toFixed(2)}</span>
        </p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {selectedIds.length > 0 && <div className="px-4 pt-4"><BulkActionsBar count={selectedIds.length} onClear={clearSelection} onDelete={handleBulkDelete} label="expenses" /></div>}
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40, paddingLeft: 16 }}>
                  <input type="checkbox" className="table-checkbox" checked={filteredData.length > 0 && filteredData.every(e => selectedIds.includes(e.id))} onChange={() => toggleAll(filteredData.map(e => e.id))} />
                </th>
                <FilterableHeader label="Date" columnKey="date" type="date" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Category" columnKey="category" type="select" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Description" columnKey="description" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Payment" columnKey="payment" type="select" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Amount" columnKey="amount" type="number" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-gray-500 py-8">No expenses found.</td>
                </tr>
              ) : (
                filteredData.map(expense => (
                  <tr key={expense.id} className={selectedIds.includes(expense.id) ? 'bg-teal/5' : ''}>
                    <td style={{ paddingLeft: 16 }}>
                      <input type="checkbox" className="table-checkbox" checked={selectedIds.includes(expense.id)} onChange={() => toggleSelection(expense.id)} />
                    </td>
                    <td>{expense.date}</td>
                    <td>
                      <span className="badge-warning">{expense.category}</span>
                    </td>
                    <td>{expense.description || '—'}</td>
                    <td>{expense.payment || '—'}</td>
                    <td className="font-semibold text-red-400">GHS {Number(expense.amount).toFixed(2)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingExpense(expense)} className="text-blue-400 hover:text-blue-300 text-sm cursor-pointer">
                          <i className="fas fa-pen-to-square" />
                        </button>
                        <button onClick={() => handleDelete(expense)} className="text-red-400 hover:text-red-300 text-sm cursor-pointer">
                          <i className="fas fa-trash" />
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

      <Pagination page={page} totalPages={Math.ceil((expenses.total || 0) / perPage)} onPageChange={setPage} />

      {editingExpense && <EditExpenseModal expense={editingExpense} onClose={() => setEditingExpense(null)} onSaved={() => { setEditingExpense(null); fetchExpenses(); }} />}
    </div>
  );
}
