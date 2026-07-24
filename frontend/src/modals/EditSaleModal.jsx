import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../components/Modal';
import api from '../api';
import CustomSelect from '../components/CustomSelect';
import { parseExtras } from '../utils/helpers';

export default function EditSaleModal({ sale, onClose, onSaved }) {
  const { menuItems, extras } = useAuth();
  const { showAlert } = useModal();
  const [loading, setLoading] = useState(false);

  const [date, setDate] = useState(sale.date || '');
  const [staff, setStaff] = useState(sale.staff || '');
  const [itemName, setItemName] = useState(sale.item || '');
  const [size, setSize] = useState(sale.size || '');
  const [qty, setQty] = useState(sale.qty || 1);
  const [unitPrice, setUnitPrice] = useState(sale.unitPrice || 0);
  const [saleExtras, setSaleExtras] = useState(() => parseExtras(sale.extraItem, sale.extraCost, extras));
  const [payment, setPayment] = useState(sale.payment || 'Cash');

  const selectedItem = menuItems.find(m => m.name === itemName);
  const sizes = selectedItem?.sizes || {};
  const sizeOptions = Object.keys(sizes);

  useEffect(() => {
    if (selectedItem && size && sizes[size] !== undefined) {
      setUnitPrice(sizes[size]);
    }
  }, [itemName, size]);

  const extrasCost = saleExtras.reduce((sum, ex) => {
    const found = extras.find(e => e.name === ex.name);
    return sum + (found ? Number(found.price) * Number(ex.qty || 0) : 0);
  }, 0);

  const total = (qty * unitPrice) + extrasCost;

  const handleExtraChange = (index, field, value) => {
    setSaleExtras(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: field === 'qty' ? Number(value) : value };
      return updated;
    });
  };

  const addExtra = () => {
    setSaleExtras(prev => [...prev, { name: '', qty: 1 }]);
  };

  const removeExtra = (index) => {
    setSaleExtras(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const extraItemStr = saleExtras.length === 1
        ? saleExtras[0].name
        : saleExtras.length > 0
          ? JSON.stringify(saleExtras)
          : '';
      const payload = {
        date,
        staff,
        item: itemName,
        size,
        qty: Number(qty),
        unitPrice: Number(unitPrice),
        extraItem: extraItemStr,
        extraCost: Number(extrasCost),
        total: Number(total),
        payment,
      };
      await api.put(`sales/${sale.id}`, payload);
      if (onSaved) onSaved();
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to update sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="glass-panel w-[90%] max-w-[500px] max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-teal">Edit Sale</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field w-full" required />
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Staff</label>
            <input type="text" value={staff} onChange={e => setStaff(e.target.value)} className="input-field w-full" required />
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Item</label>
            <CustomSelect value={itemName} onChange={(val) => { setItemName(val); setSize(''); }} options={menuItems.map(m => m.name)} placeholder="Select item" required />
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Size</label>
            <CustomSelect value={size} onChange={setSize} options={sizeOptions} placeholder="Select size" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-1">Qty</label>
              <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} className="input-field w-full" required />
            </div>
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-1">Unit Price</label>
              <input type="number" step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className="input-field w-full" required />
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-gray-400 text-sm font-medium">Extras</label>
              <button type="button" onClick={addExtra} className="text-xs text-teal hover:text-teal-deep transition-colors cursor-pointer flex items-center gap-1">
                <i className="fas fa-plus-circle" /> Add Extra
              </button>
            </div>
            {saleExtras.length === 0 ? (
              <p className="text-gray-600 text-xs">No extras</p>
            ) : (
              <div className="space-y-2">
                {saleExtras.map((ex, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CustomSelect value={ex.name} onChange={(val) => handleExtraChange(idx, 'name', val)} options={extras.map(e => e.name)} placeholder="Select extra" className="text-sm flex-1" />
                    <input type="number" min="1" value={ex.qty} onChange={e => handleExtraChange(idx, 'qty', e.target.value)} className="input-field text-sm w-20" required />
                    <button type="button" onClick={() => removeExtra(idx)} className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer shrink-0">
                      <i className="fas fa-trash text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Payment</label>
            <CustomSelect value={payment} onChange={setPayment} options={['Cash', 'MoMo', 'Bolt Food', 'Delivery']} placeholder="Select payment" required />
          </div>

          <div className="bg-white/[0.03] rounded-lg p-3 text-right border border-white/[0.04]">
            <span className="text-gray-400 text-sm mr-2">Total:</span>
            <span className="text-teal text-xl font-bold">GHS {total.toFixed(2)}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 px-4 py-2 rounded-lg font-semibold disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
