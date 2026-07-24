import { useState } from 'react';
import { useModal } from '../components/Modal';
import api from '../api';
import CustomSelect from '../components/CustomSelect';

export default function EditIngredientModal({ ingredient, onClose, onSaved }) {
  const { showAlert } = useModal();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(ingredient.name || '');
  const [unit, setUnit] = useState(ingredient.unit || 'kg');
  const [stock, setStock] = useState(ingredient.stock || 0);
  const [reorderLevel, setReorderLevel] = useState(ingredient.reorder_level || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`ingredients/${ingredient.id}`, {
        name,
        unit,
        stock: Number(stock),
        reorder_level: Number(reorderLevel),
      });
      onSaved();
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to update ingredient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="glass-panel w-[90%] max-w-[500px] max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-teal">Edit Ingredient</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-teal-light text-sm font-medium mb-1">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field w-full" required />
          </div>

          <div>
            <label className="block text-teal-light text-sm font-medium mb-1">Unit</label>
            <CustomSelect value={unit} onChange={setUnit} options={['kg', 'litre', 'pack', 'piece']} placeholder="Select unit" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-teal-light text-sm font-medium mb-1">Current Stock</label>
              <input type="number" min="0" step="0.01" value={stock} onChange={e => setStock(e.target.value)} className="input-field w-full" required />
            </div>
            <div>
              <label className="block text-teal-light text-sm font-medium mb-1">Reorder Level</label>
              <input type="number" min="0" step="0.01" value={reorderLevel} onChange={e => setReorderLevel(e.target.value)} className="input-field w-full" required />
            </div>
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
