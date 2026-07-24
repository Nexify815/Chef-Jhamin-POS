import { useState, useEffect } from 'react';
import { useModal } from '../../components/Modal';
import api from '../../api';
import { useTableFilters } from '../../hooks/useTableFilters';
import FilterableHeader from '../../components/FilterableHeader';
import CustomSelect from '../../components/CustomSelect';
import useTableSelection from '../../hooks/useTableSelection';
import PageLoader from '../../components/PageLoader';
import BulkActionsBar from '../../components/BulkActionsBar';

const columns = [
  { key: 'supplier', label: 'Supplier', type: 'text' },
  { key: 'total', label: 'Total', type: 'number' },
  { key: 'status', label: 'Status', type: 'select' },
];

export default function PurchaseOrders() {
  const { showAlert, showConfirm } = useModal();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');

  const normalizedOrders = orders.map(o => ({ ...o, supplier: o.supplier || o.supplier_name || '' }));
  const { filters, setFilter, clearFilter, openFilter, setOpenFilter, filteredData, columnOptions, getFilterLabel } = useTableFilters(normalizedOrders, columns);
  const { selectedIds, toggleSelection, toggleAll, clearSelection } = useTableSelection();

  const [newSupplier, setNewSupplier] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newItems, setNewItems] = useState([{ ingredient: '', qty: '', unitCost: '' }]);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('purchase-orders'),
      api.get('suppliers'),
      api.get('ingredients'),
    ])
      .then(([poRes, supRes, ingRes]) => {
        setOrders(Array.isArray(poRes) ? poRes : []);
        setSuppliers(Array.isArray(supRes) ? supRes : []);
        setIngredients(Array.isArray(ingRes) ? ingRes : []);
      })
      .catch(() => showAlert('error', 'Error', 'Failed to load data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleItemChange = (index, field, value) => {
    const updated = [...newItems];
    updated[index] = { ...updated[index], [field]: value };
    setNewItems(updated);
  };

  const addItem = () => {
    setNewItems([...newItems, { ingredient: '', qty: '', unitCost: '' }]);
  };

  const removeItem = (index) => {
    if (newItems.length <= 1) return;
    setNewItems(newItems.filter((_, i) => i !== index));
  };

  const totalCost = newItems.reduce((sum, item) => {
    const qty = Number(item.qty) || 0;
    const cost = Number(item.unitCost) || 0;
    return sum + qty * cost;
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newSupplier) {
      showAlert('warning', 'Required', 'Please select a supplier.');
      return;
    }
    const validItems = newItems.filter(i => i.ingredient && Number(i.qty) > 0);
    if (validItems.length === 0) {
      showAlert('warning', 'Required', 'Add at least one item with a quantity.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('purchase-orders', {
        supplier_id: Number(newSupplier),
        items: validItems.map(i => ({
          ingredient_id: Number(i.ingredient),
          qty: Number(i.qty),
          unit_cost: Number(i.unitCost) || 0,
        })),
        total: totalCost,
        notes: newNotes,
      });
      setNewSupplier('');
      setNewNotes('');
      setNewItems([{ ingredient: '', qty: '', unitCost: '' }]);
      fetchData();
      showAlert('success', 'Created', 'Purchase order created successfully.');
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to create purchase order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (order) => {
    showConfirm('Delete Order', `Delete purchase order #${order.id}?`, async () => {
      try {
        await api.delete(`purchase-orders/${order.id}`);
        fetchData();
      } catch (err) {
        showAlert('error', 'Error', err.message || 'Failed to delete purchase order.');
      }
    });
  };

  const handleBulkDelete = async () => {
    try {
      await api.post('purchase-orders/bulk-delete', { ids: selectedIds });
      clearSelection();
      fetchData();
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to delete purchase orders.');
    }
  };

  const filtered = statusFilter === 'All'
    ? filteredData
    : filteredData.filter(o => o.status?.toLowerCase() === statusFilter.toLowerCase());

  const statusStyles = {
    pending: 'badge-warning',
    received: 'badge-success',
    cancelled: 'badge-danger',
  };

  const getItemsSummary = (items) => {
    if (!items) return '—';
    try {
      const parsed = typeof items === 'string' ? JSON.parse(items) : items;
      if (Array.isArray(parsed)) {
        return parsed.map(i => i.name || i.ingredient || `Item #${i.ingredient_id}`).join(', ');
      }
    } catch {}
    return String(items).substring(0, 60);
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Purchase Orders</h1>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-teal uppercase tracking-wider mb-4">
          <i className="fas fa-plus-circle mr-2" />New Purchase Order
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Supplier</label>
              <CustomSelect value={newSupplier} onChange={setNewSupplier} options={suppliers.map(s => ({ value: s.id, label: s.name }))} placeholder="Select supplier" required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Notes</label>
              <input type="text" value={newNotes} onChange={e => setNewNotes(e.target.value)} className="input-field text-sm" placeholder="Optional" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs text-gray-400">Items</label>
              <button type="button" onClick={addItem} className="text-xs text-teal hover:text-teal-light cursor-pointer">
                <i className="fas fa-plus mr-1" />Add Item
              </button>
            </div>
            <div className="space-y-2">
              {newItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                  <div className="sm:col-span-2">
                    <CustomSelect
                      value={item.ingredient}
                      onChange={(val) => handleItemChange(idx, 'ingredient', val)}
                      options={ingredients.map(ing => ({ value: ing.id, label: `${ing.name} (${ing.unit})` }))}
                      placeholder="Select ingredient"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.qty}
                      onChange={e => handleItemChange(idx, 'qty', e.target.value)}
                      className="input-field text-sm"
                      placeholder="Qty"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitCost}
                      onChange={e => handleItemChange(idx, 'unitCost', e.target.value)}
                      className="input-field text-sm"
                      placeholder="Unit Cost"
                    />
                    {newItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-red-400 hover:text-red-300 text-sm cursor-pointer px-2"
                      >
                        <i className="fas fa-times" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <p className="text-sm text-gray-400">
              Total: <span className="text-teal font-bold">GHS {totalCost.toFixed(2)}</span>
            </p>
            <button type="submit" disabled={submitting} className="btn-primary text-sm px-6 py-3 disabled:opacity-50">
              {submitting ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check mr-2" />Create Order</>}
            </button>
          </div>
        </form>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center gap-2 flex-wrap">
          {['All', 'Pending', 'Received', 'Cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                statusFilter === s
                  ? 'bg-[var(--teal)] text-white border-none'
                  : 'btn-secondary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Showing <span className="text-white font-semibold">{filtered.length}</span> orders
        </p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {selectedIds.length > 0 && <div className="px-4 pt-4"><BulkActionsBar count={selectedIds.length} onClear={clearSelection} onDelete={handleBulkDelete} label="orders" /></div>}
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40, paddingLeft: 16 }}>
                  <input type="checkbox" className="table-checkbox" checked={filtered.length > 0 && filtered.every(o => selectedIds.includes(o.id))} onChange={() => toggleAll(filtered.map(o => o.id))} />
                </th>
                <th>Date</th>
                <FilterableHeader label="Supplier" columnKey="supplier" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <th>Items</th>
                <FilterableHeader label="Total" columnKey="total" type="number" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Status" columnKey="status" type="select" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-gray-500 py-8">No purchase orders found.</td>
                </tr>
              ) : (
                filtered.map(order => (
                  <tr key={order.id} className={selectedIds.includes(order.id) ? 'bg-teal/5' : ''}>
                    <td style={{ paddingLeft: 16 }}>
                      <input type="checkbox" className="table-checkbox" checked={selectedIds.includes(order.id)} onChange={() => toggleSelection(order.id)} />
                    </td>
                    <td>{order.date || order.created_at || '—'}</td>
                    <td className="font-medium text-white">{order.supplier || order.supplier_name || '—'}</td>
                    <td className="max-w-[200px] truncate">{getItemsSummary(order.items)}</td>
                    <td className="font-semibold text-teal">GHS {Number(order.total || 0).toFixed(2)}</td>
                    <td>
                      <span className={statusStyles[order.status?.toLowerCase()] || 'badge-info'}>
                        {order.status || 'Pending'}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => handleDelete(order)} className="text-red-400 hover:text-red-300 text-sm cursor-pointer">
                        <i className="fas fa-trash" />
                      </button>
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
