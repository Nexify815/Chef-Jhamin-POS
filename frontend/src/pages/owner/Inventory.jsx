import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../components/Modal';
import api from '../../api';
import { useTableFilters } from '../../hooks/useTableFilters';
import FilterableHeader from '../../components/FilterableHeader';
import CustomSelect from '../../components/CustomSelect';

const columns = [
  { key: 'name', label: 'Item', type: 'text' },
  { key: 'unit', label: 'Unit', type: 'select' },
  { key: 'stock', label: 'Stock', type: 'number' },
  { key: 'reorder_level', label: 'Reorder Level', type: 'number' },
];

export default function Inventory() {
  const { ingredients, refreshData } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const [loading, setLoading] = useState(false);

  const [selectedId, setSelectedId] = useState('');
  const [qtyIn, setQtyIn] = useState('');
  const [qtyOut, setQtyOut] = useState('');
  const [notes, setNotes] = useState('');
  const { filters, setFilter, clearFilter, openFilter, setOpenFilter, filteredData, columnOptions, getFilterLabel } = useTableFilters(ingredients, columns);

  const selectedItem = ingredients.find(i => String(i.id) === String(selectedId));
  const currentStock = selectedItem ? Number(selectedItem.stock) : 0;
  const inVal = Number(qtyIn) || 0;
  const outVal = Number(qtyOut) || 0;
  const newBalance = currentStock + inVal - outVal;

  const doUpdate = async () => {
    setLoading(true);
    try {
      if (inVal > 0) {
        await api.post('inventory/update', { id: Number(selectedId), qty: inVal, type: 'in', notes });
      }
      if (outVal > 0) {
        await api.post('inventory/update', { id: Number(selectedId), qty: outVal, type: 'out', notes });
      }
      setQtyIn('');
      setQtyOut('');
      setNotes('');
      await refreshData();
      showAlert('success', 'Updated', 'Inventory updated successfully.');
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to update inventory.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedId) {
      showAlert('warning', 'Required', 'Please select an item.');
      return;
    }
    if (inVal === 0 && outVal === 0) {
      showAlert('warning', 'Required', 'Enter quantity in or out.');
      return;
    }
    if (newBalance < 0) {
      showAlert('warning', 'Invalid', 'Balance cannot be negative.');
      return;
    }
    const action = inVal > 0 ? `add ${inVal} to stock` : `remove ${outVal} from stock`;
    showConfirm('Confirm Update', `Update ${selectedItem?.name || 'item'}: ${action}? New balance will be ${newBalance}.`, doUpdate);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Inventory</h1>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-teal uppercase tracking-wider mb-4">
          <i className="fas fa-arrow-right-arrow-left mr-2" />Update Inventory
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Item</label>
            <div className="relative"><CustomSelect value={selectedId} onChange={(val) => { setSelectedId(val); setQtyIn(''); setQtyOut(''); }} options={ingredients.map(i => ({ value: i.id, label: `${i.name} (${i.unit})` }))} placeholder="Select item" required /></div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Qty In</label>
            <input type="number" min="0" step="0.01" value={qtyIn} onChange={e => setQtyIn(e.target.value)} className="input-field text-sm" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Qty Out</label>
            <input type="number" min="0" step="0.01" value={qtyOut} onChange={e => setQtyOut(e.target.value)} className="input-field text-sm" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input-field text-sm" placeholder="Optional" />
          </div>
          {selectedId && (
            <div className="sm:col-span-2 lg:col-span-4">
              <div className="bg-white/[0.03] rounded-xl p-3 flex items-center gap-4 text-sm border border-white/[0.04]">
                <span className="text-gray-400">Current Stock: <span className="text-white font-semibold">{currentStock}</span></span>
                <i className="fas fa-arrow-right text-teal" />
                <span className="text-gray-400">New Balance: <span className={`font-bold ${newBalance < 0 ? 'text-red-400' : newBalance <= (selectedItem?.reorder_level || 0) ? 'text-amber-400' : 'text-emerald-400'}`}>{newBalance}</span></span>
              </div>
            </div>
          )}
          <div className="flex items-end">
            <button type="submit" disabled={loading} className="btn-primary text-sm px-6 py-3 w-full disabled:opacity-50">
              {loading ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check mr-2" />Update</>}
            </button>
          </div>
        </form>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <FilterableHeader label="Item" columnKey="name" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Unit" columnKey="unit" type="select" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Stock" columnKey="stock" type="number" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Reorder Level" columnKey="reorder_level" type="number" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-gray-500 py-8">No ingredients found.</td>
                </tr>
              ) : (
                filteredData.map(ing => {
                  const stock = Number(ing.stock);
                  const reorder = Number(ing.reorder_level);
                  const isLow = stock <= reorder;
                  return (
                    <tr key={ing.id}>
                      <td className="font-medium text-white">{ing.name}</td>
                      <td>{ing.unit}</td>
                      <td className={isLow ? 'text-red-400 font-semibold' : 'text-emerald-400 font-semibold'}>{stock}</td>
                      <td>{reorder}</td>
                      <td>
                        <span className={isLow ? 'badge-danger' : 'badge-success'}>
                          {isLow ? 'LOW' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
