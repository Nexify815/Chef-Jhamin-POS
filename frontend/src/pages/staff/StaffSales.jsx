import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { useModal } from '../../components/Modal';
import EditSaleModal from '../../modals/EditSaleModal';
import { useTableFilters } from '../../hooks/useTableFilters';
import FilterableHeader from '../../components/FilterableHeader';
import CustomSelect from '../../components/CustomSelect';
import useTableSelection from '../../hooks/useTableSelection';
import BulkActionsBar from '../../components/BulkActionsBar';
import PageLoader from '../../components/PageLoader';
import { today, fmt, parseExtras } from '../../utils/helpers';

const defaultForm = () => ({
  date: today(),
  staff: '',
  item: '',
  size: '',
  qty: 1,
  unitPrice: 0,
  extras: [],
  payment: 'Cash',
  total: 0,
  customer_name: '',
  discount: '',
});

export default function StaffSales() {
  const { user } = useAuth();
  const { openModal, closeModal, showAlert, showConfirm } = useModal();

  const [form, setForm] = useState(defaultForm());
  const [menuItems, setMenuItems] = useState([]);
  const [extras, setExtras] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);


  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [menuRes, salesRes, extrasRes] = await Promise.all([
        api.get('menu'),
        api.get('sales'),
        api.get('extras'),
      ]);
      setMenuItems(Array.isArray(menuRes) ? menuRes : []);
      setExtras(Array.isArray(extrasRes) ? extrasRes : []);
      const todayStr = today();
      const allSales = Array.isArray(salesRes) ? salesRes : (salesRes.rows || []);
      setSales(allSales.filter((s) => s.date?.slice(0, 10) === todayStr).reverse());
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, staff: user?.name || '' }));
  }, [user]);

  useEffect(() => {
    const selected = menuItems.find((m) => m.name === form.item);
    const price = selected ? Number(selected.sizes?.[form.size] || 0) : 0;
    const extrasCost = form.extras.reduce((sum, ex) => {
      const found = extras.find((e) => e.name === ex.name);
      return sum + (found ? Number(found.price) * Number(ex.qty || 0) : 0);
    }, 0);
    const total = Number(form.qty || 0) * price + extrasCost - Number(form.discount || 0);
    setForm((prev) => ({ ...prev, unitPrice: price, total }));
  }, [form.item, form.size, form.qty, form.extras, form.discount, menuItems, extras]);

  const sizeKeys = form.item ? Object.keys(menuItems.find((m) => m.name === form.item)?.sizes || {}) : [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleExtraChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.extras];
      updated[index] = { ...updated[index], [field]: field === 'qty' ? Number(value) : value };
      return { ...prev, extras: updated };
    });
  };

  const addExtra = () => {
    setForm((prev) => ({ ...prev, extras: [...prev.extras, { name: '', qty: 1 }] }));
  };

  const removeExtra = (index) => {
    setForm((prev) => ({ ...prev, extras: prev.extras.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const extrasCost = form.extras.reduce((sum, ex) => {
        const found = extras.find((e) => e.name === ex.name);
        return sum + (found ? Number(found.price) * Number(ex.qty || 0) : 0);
      }, 0);
      const extraItemStr = form.extras.length === 1
        ? form.extras[0].name
        : form.extras.length > 0
          ? JSON.stringify(form.extras)
          : '';
      await api.post('sales', {
        date: form.date,
        staff: form.staff,
        item: form.item,
        size: form.size,
        qty: Number(form.qty),
        unitPrice: form.unitPrice,
        extraItem: extraItemStr,
        extraCost: extrasCost,
        payment: form.payment,
        total: form.total,
        customer_name: form.customer_name || '',
        discount: Number(form.discount || 0),
      });
      setForm(defaultForm());
      setForm((prev) => ({ ...prev, staff: user?.name || '' }));
      fetchData();
    } catch (e) {
      showAlert('error', 'Error', e.message || 'Failed to record sale.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    showConfirm('Delete Sale', 'Are you sure you want to delete this sale?', async () => {
      try {
        await api.delete(`sales/${id}`);
        fetchData();
      } catch (e) {
        showAlert('error', 'Error', e.message || 'Failed to delete sale.');
      }
    });
  };

  const openEdit = (sale) =>
    openModal(<EditSaleModal sale={sale} onClose={() => { closeModal(); fetchData(); }} onSaved={() => { closeModal(); fetchData(); }} />);

  const saleColumns = [
    { key: 'item', label: 'Item', type: 'text' },
    { key: 'size', label: 'Size', type: 'text' },
    { key: 'qty', label: 'Qty', type: 'number' },
    { key: 'total', label: 'Total', type: 'number' },
    { key: 'payment', label: 'Payment', type: 'select' },
    { key: 'customer_name', label: 'Customer', type: 'text' },
  ];

  const { filters, setFilter, clearFilter, openFilter, setOpenFilter, filteredData: filteredSales, columnOptions, getFilterLabel } = useTableFilters(sales, saleColumns);
  const { selectedIds, toggleSelection, toggleAll, clearSelection } = useTableSelection();

  const formatExtrasDisplay = (sale) => {
    const parsed = parseExtras(sale.extraItem, sale.extraCost, extras);
    if (parsed.length === 0) return '-';
    return parsed.map((ex) => `${ex.name} x${ex.qty}`).join(', ');
  };

  const handleBulkDelete = async () => {
    try {
      await api.post('sales/bulk-delete', { ids: selectedIds });
      clearSelection();
      fetchData();
    } catch (e) {
      showAlert('error', 'Error', e.message || 'Failed to delete sales.');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Sales</h1>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Date</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} className="input-field w-full" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Staff</label>
            <input type="text" value={form.staff} readOnly className="input-field w-full bg-white/5" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Item</label>
            <CustomSelect
              value={form.item}
              onChange={(val) => setForm({...form, item: val, size: ''})}
              options={menuItems.map(m => ({ value: m.name, label: m.name }))}
              placeholder="Select item"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Size</label>
            <CustomSelect
              value={form.size}
              onChange={(val) => setForm({...form, size: val})}
              options={sizeKeys}
              placeholder="Select size"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Qty</label>
            <input type="number" name="qty" value={form.qty} onChange={handleChange} min="1" className="input-field w-full" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Unit Price</label>
            <input type="text" value={`GHS ${fmt(form.unitPrice)}`} readOnly className="input-field w-full bg-white/5" />
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
          <div>
            <label className="block text-sm text-gray-400 mb-1">Customer Name</label>
            <input type="text" name="customer_name" value={form.customer_name} onChange={handleChange} className="input-field w-full" placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Discount (GHS)</label>
            <input type="number" name="discount" value={form.discount} onChange={handleChange} min="0" step="0.01" className="input-field w-full" placeholder="0.00" />
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm text-gray-400 font-medium">Extras</label>
            <button type="button" onClick={addExtra} className="text-xs text-teal hover:text-teal-deep transition-colors cursor-pointer flex items-center gap-1">
              <i className="fas fa-plus-circle" /> Add Extra
            </button>
          </div>
          {form.extras.length === 0 ? (
            <p className="text-gray-600 text-xs">No extras added</p>
          ) : (
            <div className="space-y-2">
              {form.extras.map((ex, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CustomSelect
                    value={ex.name}
                    onChange={(val) => handleExtraChange(idx, 'name', val)}
                    options={extras.map(e => e.name)}
                    placeholder="Select extra"
                    className="flex-1"
                    required
                  />
                  <input type="number" min="1" value={ex.qty} onChange={(e) => handleExtraChange(idx, 'qty', e.target.value)} className="input-field text-sm w-20" required />
                  <button type="button" onClick={() => removeExtra(idx)} className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer shrink-0">
                    <i className="fas fa-trash text-xs" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xl font-bold text-white">Total: GHS {fmt(form.total)}</div>
          <button type="submit" disabled={submitting} className="btn-primary ml-auto">
            {submitting ? 'Recording...' : 'Record Sale'}
          </button>
        </div>
      </form>

      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Today's Sales</h2>
        {loading ? (
          <PageLoader text="Loading..." />
        ) : sales.length === 0 ? (
          <p className="text-gray-400 text-sm">No sales today.</p>
        ) : (
          <div className="overflow-x-auto">
            {selectedIds.length > 0 && <div className="px-4 pt-4"><BulkActionsBar count={selectedIds.length} onClear={clearSelection} onDelete={handleBulkDelete} label="sales" /></div>}
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-white/10">
                  <th style={{ width: 40, paddingLeft: 12 }}>
                    <input type="checkbox" className="table-checkbox" checked={filteredSales.length > 0 && filteredSales.every(s => selectedIds.includes(s.id))} onChange={() => toggleAll(filteredSales.map(s => s.id))} />
                  </th>
                  <FilterableHeader label="Item" columnKey="item" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                  <FilterableHeader label="Size" columnKey="size" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                  <FilterableHeader label="Qty" columnKey="qty" type="number" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                  <th className="text-left py-2 px-3">Extras</th>
                  <FilterableHeader label="Total" columnKey="total" type="number" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                  <FilterableHeader label="Payment" columnKey="payment" type="select" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                  <FilterableHeader label="Customer" columnKey="customer_name" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                  <th className="text-center py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className={`border-b border-white/5 text-gray-300 ${selectedIds.includes(sale.id) ? 'bg-teal/5' : ''}`}>
                    <td style={{ paddingLeft: 12 }}>
                      <input type="checkbox" className="table-checkbox" checked={selectedIds.includes(sale.id)} onChange={() => toggleSelection(sale.id)} />
                    </td>
                    <td className="py-2 px-3">{sale.item}</td>
                    <td className="py-2 px-3">{sale.size || '-'}</td>
                    <td className="py-2 px-3 text-center">{sale.qty}</td>
                    <td className="py-2 px-3 text-xs">{formatExtrasDisplay(sale)}</td>
                    <td className="py-2 px-3 text-right font-medium text-white">GHS {fmt(sale.total)}</td>
                    <td className="py-2 px-3">
                      <span className={`badge-${sale.payment === 'Cash' ? 'success' : 'warning'}`}>
                        {sale.payment}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs">{sale.customer_name || '-'}</td>
                    <td className="py-2 px-3 text-center">
                      <button onClick={() => openEdit(sale)} className="text-blue-400 hover:text-blue-300 mr-3">
                        <i className="fa-solid fa-pen-to-square" />
                      </button>
                      <button onClick={() => handleDelete(sale.id)} className="text-red-400 hover:text-red-300">
                        <i className="fa-solid fa-trash" />
                      </button>
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
