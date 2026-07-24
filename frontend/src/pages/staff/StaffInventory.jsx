import { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import { useModal } from '../../components/Modal';
import { useTableFilters } from '../../hooks/useTableFilters';
import FilterableHeader from '../../components/FilterableHeader';
import CustomSelect from '../../components/CustomSelect';
import PageLoader from '../../components/PageLoader';

const columns = [
  { key: 'name', label: 'Item', type: 'text' },
  { key: 'unit', label: 'Unit', type: 'select' },
  { key: 'stock', label: 'Stock', type: 'number' },
];

const defaultForm = () => ({
  id: '',
  qty: '',
  type: 'in',
  notes: '',
});

export default function StaffInventory() {
  const { showAlert } = useModal();
  const [inventory, setInventory] = useState([]);
  const [form, setForm] = useState(defaultForm());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('ingredients');
      setInventory(res || []);
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { filters, setFilter, clearFilter, openFilter, setOpenFilter, filteredData, columnOptions, getFilterLabel } = useTableFilters(inventory, columns);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const selectedItem = inventory.find((i) => String(i.id) === String(form.id));

  const balanceChange =
    form.type === 'in' ? Number(form.qty || 0) : -Number(form.qty || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.type === 'out' && selectedItem && Number(form.qty) > selectedItem.stock) {
      showAlert('warning', 'Insufficient Stock', `Cannot remove ${form.qty} ${selectedItem.unit}. Only ${selectedItem.stock} ${selectedItem.unit} in stock.`);
      return;
    }
    setSubmitting(true);
    try {
      await api.post('inventory/update', {
        id: Number(form.id),
        qty: Number(form.qty),
        type: form.type,
        notes: form.notes,
      });
      setForm(defaultForm());
      fetchData();
    } catch (e) {
      showAlert('error', 'Error', e.message || 'Failed to update inventory.');
    } finally {
      setSubmitting(false);
    }
  };

  const stockColor = (item) => {
    const reorder = Number(item.reorder_level) || 0;
    if (reorder > 0 && item.stock <= reorder) return 'text-red-400';
    if (reorder > 0 && item.stock <= reorder * 1.5) return 'text-amber-400';
    return 'text-green-400';
  };

  const statusBadge = (item) => {
    const reorder = Number(item.reorder_level) || 0;
    if (reorder > 0 && item.stock <= reorder) {
      return <span className="badge-warning">Low</span>;
    }
    return <span className="badge-success">OK</span>;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Inventory</h1>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm text-gray-400 mb-1">Item</label>
            <CustomSelect
              value={form.id}
              onChange={(val) => setForm({...form, id: val})}
              options={inventory.map(i => ({ value: i.id, label: `${i.name} (${i.unit})` }))}
              placeholder="Select item"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Qty</label>
            <input type="number" name="qty" value={form.qty} onChange={handleChange} min="1" className="input-field w-full" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Type</label>
            <CustomSelect
              value={form.type}
              onChange={(val) => setForm({...form, type: val})}
              options={['in', 'out']}
              placeholder="Select type"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Notes</label>
          <input type="text" name="notes" value={form.notes} onChange={handleChange} className="input-field w-full" placeholder="Optional notes..." />
        </div>
        <div className="flex items-center gap-4">
          {selectedItem && (
            <div className="text-sm text-gray-400">
              Current: <span className="text-white font-medium">{selectedItem.stock} {selectedItem.unit}</span>
              <span className="mx-2">{'\u2192'}</span>
              New: <span className={`font-medium ${balanceChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {selectedItem.stock + balanceChange} {selectedItem.unit}
              </span>
            </div>
          )}
          <button type="submit" disabled={submitting} className="btn-primary ml-auto">
            {submitting ? 'Updating...' : 'Update Stock'}
          </button>
        </div>
      </form>

      <div className="glass-card p-5">
        {loading ? (
          <PageLoader text="Loading..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-white/10">
                  <FilterableHeader label="Item" columnKey="name" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                  <FilterableHeader label="Unit" columnKey="unit" type="select" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                  <FilterableHeader label="Stock" columnKey="stock" type="number" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                  <th className="text-center py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 text-gray-300">
                    <td className="py-2 px-3">{item.name}</td>
                    <td className="py-2 px-3">{item.unit}</td>
                    <td className={`py-2 px-3 text-right font-medium ${stockColor(item)}`}>{item.stock}</td>
                    <td className="py-2 px-3 text-center">{statusBadge(item)}</td>
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
