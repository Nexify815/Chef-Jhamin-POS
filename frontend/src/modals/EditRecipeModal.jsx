import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../components/Modal';
import api from '../api';
import CustomSelect from '../components/CustomSelect';

export default function EditRecipeModal({ recipe, onClose, onSaved }) {
  const { menuItems, ingredients } = useAuth();
  const { showAlert } = useModal();
  const [loading, setLoading] = useState(false);

  const [menuItemId, setMenuItemId] = useState(recipe.menu_item_id || '');
  const [size, setSize] = useState(recipe.size || '');
  const [ingredientId, setIngredientId] = useState(recipe.ingredient_id || '');
  const [quantityNeeded, setQuantityNeeded] = useState(recipe.quantity_needed || '');

  const selectedItem = menuItems.find(m => String(m.id) === String(menuItemId));
  const sizes = selectedItem?.sizes || {};
  const sizeOptions = Object.keys(sizes);

  useEffect(() => {
    if (selectedItem && sizeOptions.length > 0 && !sizeOptions.includes(size)) {
      setSize(sizeOptions[0]);
    }
  }, [menuItemId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`recipes/${recipe.id}`, {
        menu_item_id: Number(menuItemId),
        size,
        ingredient_id: Number(ingredientId),
        quantity_needed: Number(quantityNeeded),
      });
      onSaved();
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to update recipe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="glass-panel w-[90%] max-w-[500px] max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-teal">Edit Recipe</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-teal-light text-sm font-medium mb-1">Menu Item</label>
            <CustomSelect value={menuItemId} onChange={(val) => { setMenuItemId(val); setSize(''); }} options={menuItems.map(m => ({ value: m.id, label: m.name }))} placeholder="Select item" required />
          </div>

          <div>
            <label className="block text-teal-light text-sm font-medium mb-1">Size</label>
            <CustomSelect value={size} onChange={setSize} options={sizeOptions} placeholder="Select size" required />
          </div>

          <div>
            <label className="block text-teal-light text-sm font-medium mb-1">Ingredient</label>
            <CustomSelect value={ingredientId} onChange={setIngredientId} options={ingredients.map(i => ({ value: i.id, label: `${i.name} (${i.unit})` }))} placeholder="Select ingredient" required />
          </div>

          <div>
            <label className="block text-teal-light text-sm font-medium mb-1">Quantity Needed</label>
            <input type="number" min="0" step="0.01" value={quantityNeeded} onChange={e => setQuantityNeeded(e.target.value)} className="input-field w-full" required />
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
