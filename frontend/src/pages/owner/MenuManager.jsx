import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../components/Modal';
import api from '../../api';
import EditMenuModal from '../../modals/EditMenuModal';
import EditExtraModal from '../../modals/EditExtraModal';
import EditIngredientModal from '../../modals/EditIngredientModal';
import EditRecipeModal from '../../modals/EditRecipeModal';
import CustomSelect from '../../components/CustomSelect';
import { useTableFilters } from '../../hooks/useTableFilters';
import FilterableHeader from '../../components/FilterableHeader';
import useTableSelection from '../../hooks/useTableSelection';
import BulkActionsBar from '../../components/BulkActionsBar';

const menuColumns = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'category', label: 'Category', type: 'select' },
];
const extraColumns = [
  { key: 'name', label: 'Name', type: 'text' },
];
const ingredientColumns = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'unit', label: 'Unit', type: 'select' },
];
const recipeColumns = [
  { key: 'item_name', label: 'Menu Item', type: 'text' },
  { key: 'size', label: 'Size', type: 'text' },
  { key: 'ingredient_name', label: 'Ingredient', type: 'text' },
];

const tabs = [
  { id: 'menu', label: 'Menu', icon: 'fas fa-utensils' },
  { id: 'extras', label: 'Extras', icon: 'fas fa-cookie-bite' },
  { id: 'ingredients', label: 'Ingredients', icon: 'fas fa-carrot' },
  { id: 'recipes', label: 'Recipes', icon: 'fas fa-book' },
];

export default function MenuManager() {
  const { menuItems, ingredients, extras, refreshData, setMenuItems, setIngredients, setExtras } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const [activeTab, setActiveTab] = useState('menu');
  const [loading, setLoading] = useState(false);

  const [editingItem, setEditingItem] = useState(null);

  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuCategory, setNewMenuCategory] = useState('Food');
  const [newMenuSmall, setNewMenuSmall] = useState('');
  const [newMenuBig, setNewMenuBig] = useState('');

  const [newExtraName, setNewExtraName] = useState('');
  const [newExtraPrice, setNewExtraPrice] = useState('');

  const [newIngName, setNewIngName] = useState('');
  const [newIngUnit, setNewIngUnit] = useState('kg');
  const [newIngStock, setNewIngStock] = useState('');
  const [newIngReorder, setNewIngReorder] = useState('');

  const [newRecipeMenuId, setNewRecipeMenuId] = useState('');
  const [newRecipeSize, setNewRecipeSize] = useState('');
  const [newRecipeIngId, setNewRecipeIngId] = useState('');
  const [newRecipeQty, setNewRecipeQty] = useState('');
  const [recipes, setRecipes] = useState([]);

  const menuFilters = useTableFilters(menuItems, menuColumns);
  const extraFilters = useTableFilters(extras, extraColumns);
  const ingredientFilters = useTableFilters(ingredients, ingredientColumns);
  const recipeFilters = useTableFilters(recipes, recipeColumns);

  const menuSel = useTableSelection();
  const extraSel = useTableSelection();
  const ingSel = useTableSelection();
  const recipeSel = useTableSelection();

  const selectedRecipeItem = menuItems.find(m => String(m.id) === String(newRecipeMenuId));
  const recipeSizeOptions = selectedRecipeItem ? Object.keys(selectedRecipeItem.sizes || {}) : [];

  const fetchRecipes = async () => {
    try {
      const res = await api.get('recipes');
      setRecipes(Array.isArray(res) ? res : []);
    } catch {}
  };

  const handleAddMenu = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const sizes = {};
      if (newMenuSmall) sizes.Small = Number(newMenuSmall);
      if (newMenuBig) sizes.Big = Number(newMenuBig);
      await api.post('menu', { name: newMenuName, category: newMenuCategory, sizes });
      setNewMenuName('');
      setNewMenuSmall('');
      setNewMenuBig('');
      await refreshData();
      showAlert('success', 'Added', 'Menu item added.');
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to add item.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMenu = (item) => {
    showConfirm('Delete Item', `Delete "${item.name}" from menu?`, async () => {
      try {
        await api.delete(`menu/${item.id}`);
        await refreshData();
      } catch (err) {
        showAlert('error', 'Error', err.message || 'Failed to delete menu item.');
      }
    });
  };

  const handleToggleAvailable = async (item) => {
    try {
      await api.put(`menu/${item.id}/toggle-available`);
      refreshData();
    } catch (err) {
      showAlert('error', 'Error', 'Failed to toggle availability.');
    }
  };

  const handleAddExtra = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('extras', { name: newExtraName, price: Number(newExtraPrice) });
      setNewExtraName('');
      setNewExtraPrice('');
      await refreshData();
      showAlert('success', 'Added', 'Extra added.');
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to add extra.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExtra = (extra) => {
    showConfirm('Delete Extra', `Delete "${extra.name}"?`, async () => {
      try {
        await api.delete(`extras/${extra.id}`);
        await refreshData();
      } catch (err) {
        showAlert('error', 'Error', err.message || 'Failed to delete extra.');
      }
    });
  };

  const handleAddIngredient = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('ingredients', {
        name: newIngName,
        unit: newIngUnit,
        stock: Number(newIngStock),
        reorder_level: Number(newIngReorder),
      });
      setNewIngName('');
      setNewIngStock('');
      setNewIngReorder('');
      await refreshData();
      showAlert('success', 'Added', 'Ingredient added.');
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to add ingredient.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIngredient = (ing) => {
    showConfirm('Delete Ingredient', `Delete "${ing.name}"? This will also remove any recipes using it.`, async () => {
      try {
        const res = await api.delete(`ingredients/${ing.id}`);
        if (res && res.error) {
          showAlert('error', 'Error', res.error || 'Failed to delete ingredient.');
          return;
        }
        await refreshData();
      } catch (err) {
        showAlert('error', 'Error', err.message || 'Failed to delete ingredient.');
      }
    });
  };

  const handleAddRecipe = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('recipes', {
        menu_item_id: Number(newRecipeMenuId),
        size: newRecipeSize,
        ingredient_id: Number(newRecipeIngId),
        quantity_needed: Number(newRecipeQty),
      });
      setNewRecipeQty('');
      fetchRecipes();
      showAlert('success', 'Added', 'Recipe added.');
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to add recipe.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = (recipe) => {
    showConfirm('Delete Recipe', `Delete this recipe entry?`, async () => {
      try {
        await api.delete(`recipes/${recipe.id}`);
        fetchRecipes();
      } catch (err) {
        showAlert('error', 'Error', err.message || 'Failed to delete recipe.');
      }
    });
  };

  const handleBulkDeleteMenu = async () => { try { await api.post('menu/bulk-delete', { ids: menuSel.selectedIds }); menuSel.clearSelection(); await refreshData(); } catch (err) { showAlert('error', 'Error', err.message || 'Failed to delete menu items.'); } };
  const handleBulkDeleteExtras = async () => { try { await api.post('extras/bulk-delete', { ids: extraSel.selectedIds }); extraSel.clearSelection(); await refreshData(); } catch (err) { showAlert('error', 'Error', err.message || 'Failed to delete extras.'); } };
  const handleBulkDeleteIngredients = async () => { try { await api.post('ingredients/bulk-delete', { ids: ingSel.selectedIds }); ingSel.clearSelection(); await refreshData(); } catch (err) { showAlert('error', 'Error', err.message || 'Failed to delete ingredients.'); } };
  const handleBulkDeleteRecipes = async () => { try { await api.post('recipes/bulk-delete', { ids: recipeSel.selectedIds }); recipeSel.clearSelection(); fetchRecipes(); } catch (err) { showAlert('error', 'Error', err.message || 'Failed to delete recipes.'); } };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Menu Manager</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); if (tab.id === 'recipes') fetchRecipes(); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-teal to-teal-deep text-white'
                : 'bg-white/[0.04] text-gray-500 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <i className={tab.icon} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'menu' && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-teal uppercase tracking-wider mb-4">
              <i className="fas fa-plus-circle mr-2" />Add Menu Item
            </h3>
            <form onSubmit={handleAddMenu} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input type="text" value={newMenuName} onChange={e => setNewMenuName(e.target.value)} className="input-field text-sm" placeholder="Item name" required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <CustomSelect
                  value={newMenuCategory}
                  onChange={setNewMenuCategory}
                  options={['Food', 'Drink']}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Small Price (GHS)</label>
                <input type="number" step="0.01" min="0" value={newMenuSmall} onChange={e => setNewMenuSmall(e.target.value)} className="input-field text-sm" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Big Price (GHS)</label>
                <input type="number" step="0.01" min="0" value={newMenuBig} onChange={e => setNewMenuBig(e.target.value)} className="input-field text-sm" placeholder="0.00" />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <button type="submit" disabled={loading} className="btn-primary text-sm px-6 py-2 disabled:opacity-50">
                  {loading ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-plus mr-2" />Add Item</>}
                </button>
              </div>
            </form>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              {menuSel.selectedIds.length > 0 && <div className="px-4 pt-4"><BulkActionsBar count={menuSel.selectedIds.length} onClear={menuSel.clearSelection} onDelete={handleBulkDeleteMenu} label="menu items" /></div>}
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40, paddingLeft: 16 }}>
                      <input type="checkbox" className="table-checkbox" checked={menuFilters.filteredData.length > 0 && menuFilters.filteredData.every(m => menuSel.selectedIds.includes(m.id))} onChange={() => menuSel.toggleAll(menuFilters.filteredData.map(m => m.id))} />
                    </th>
                    <FilterableHeader label="Name" columnKey="name" type="text" filters={menuFilters.filters} setFilter={menuFilters.setFilter} clearFilter={menuFilters.clearFilter} openFilter={menuFilters.openFilter} setOpenFilter={menuFilters.setOpenFilter} columnOptions={menuFilters.columnOptions} getFilterLabel={menuFilters.getFilterLabel} />
                    <FilterableHeader label="Category" columnKey="category" type="select" filters={menuFilters.filters} setFilter={menuFilters.setFilter} clearFilter={menuFilters.clearFilter} openFilter={menuFilters.openFilter} setOpenFilter={menuFilters.setOpenFilter} columnOptions={menuFilters.columnOptions} getFilterLabel={menuFilters.getFilterLabel} />
                    <th>Prices</th>
                    <th>Available</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menuFilters.filteredData.length === 0 ? (
                    <tr><td colSpan="6" className="text-center text-gray-500 py-8">No menu items.</td></tr>
                  ) : (
                    menuFilters.filteredData.map(item => (
                      <tr key={item.id} className={menuSel.selectedIds.includes(item.id) ? 'bg-teal/5' : ''}>
                        <td style={{ paddingLeft: 16 }}>
                          <input type="checkbox" className="table-checkbox" checked={menuSel.selectedIds.includes(item.id)} onChange={() => menuSel.toggleSelection(item.id)} />
                        </td>
                        <td className="font-medium text-white">{item.name}</td>
                        <td><span className={item.category === 'Food' ? 'badge-success' : 'badge-warning'}>{item.category}</span></td>
                        <td>
                          {Object.entries(item.sizes || {}).map(([sz, price]) => (
                            <span key={sz} className="mr-3 text-sm">
                              <span className="text-gray-500">{sz}:</span> <span className="text-teal">GHS {Number(price).toFixed(2)}</span>
                            </span>
                          ))}
                        </td>
                        <td>
                          <button onClick={() => handleToggleAvailable(item)} className="text-sm cursor-pointer px-2 py-1 rounded-lg transition-all"
                            style={{ background: item.available !== 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: item.available !== 0 ? '#34D399' : '#F87171' }}>
                            {item.available !== 0 ? 'In Stock' : 'Unavailable'}
                          </button>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingItem({ type: 'menu', data: item })} className="text-blue-400 hover:text-blue-300 text-sm cursor-pointer">
                              <i className="fas fa-pen-to-square" />
                            </button>
                            <button onClick={() => handleDeleteMenu(item)} className="text-red-400 hover:text-red-300 text-sm cursor-pointer">
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
        </div>
      )}

      {activeTab === 'extras' && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-teal uppercase tracking-wider mb-4">
              <i className="fas fa-plus-circle mr-2" />Add Extra
            </h3>
            <form onSubmit={handleAddExtra} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input type="text" value={newExtraName} onChange={e => setNewExtraName(e.target.value)} className="input-field text-sm" placeholder="Extra name" required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Price (GHS)</label>
                <input type="number" step="0.01" min="0" value={newExtraPrice} onChange={e => setNewExtraPrice(e.target.value)} className="input-field text-sm" placeholder="0.00" required />
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={loading} className="btn-primary text-sm px-6 py-3 w-full disabled:opacity-50">
                  {loading ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-plus mr-2" />Add Extra</>}
                </button>
              </div>
            </form>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              {extraSel.selectedIds.length > 0 && <div className="px-4 pt-4"><BulkActionsBar count={extraSel.selectedIds.length} onClear={extraSel.clearSelection} onDelete={handleBulkDeleteExtras} label="extras" /></div>}
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40, paddingLeft: 16 }}>
                      <input type="checkbox" className="table-checkbox" checked={extraFilters.filteredData.length > 0 && extraFilters.filteredData.every(e => extraSel.selectedIds.includes(e.id))} onChange={() => extraSel.toggleAll(extraFilters.filteredData.map(e => e.id))} />
                    </th>
                    <FilterableHeader label="Name" columnKey="name" type="text" filters={extraFilters.filters} setFilter={extraFilters.setFilter} clearFilter={extraFilters.clearFilter} openFilter={extraFilters.openFilter} setOpenFilter={extraFilters.setOpenFilter} columnOptions={extraFilters.columnOptions} getFilterLabel={extraFilters.getFilterLabel} />
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {extraFilters.filteredData.length === 0 ? (
                    <tr><td colSpan="4" className="text-center text-gray-500 py-8">No extras.</td></tr>
                  ) : (
                    extraFilters.filteredData.map(extra => (
                      <tr key={extra.id} className={extraSel.selectedIds.includes(extra.id) ? 'bg-teal/5' : ''}>
                        <td style={{ paddingLeft: 16 }}>
                          <input type="checkbox" className="table-checkbox" checked={extraSel.selectedIds.includes(extra.id)} onChange={() => extraSel.toggleSelection(extra.id)} />
                        </td>
                        <td className="font-medium text-white">{extra.name}</td>
                        <td className="text-teal">GHS {Number(extra.price).toFixed(2)}</td>
                        <td>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingItem({ type: 'extra', data: extra })} className="text-blue-400 hover:text-blue-300 text-sm cursor-pointer">
                              <i className="fas fa-pen-to-square" />
                            </button>
                            <button onClick={() => handleDeleteExtra(extra)} className="text-red-400 hover:text-red-300 text-sm cursor-pointer">
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
        </div>
      )}

      {activeTab === 'ingredients' && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-teal uppercase tracking-wider mb-4">
              <i className="fas fa-plus-circle mr-2" />Add Ingredient
            </h3>
            <form onSubmit={handleAddIngredient} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input type="text" value={newIngName} onChange={e => setNewIngName(e.target.value)} className="input-field text-sm" placeholder="Name" required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Unit</label>
                <CustomSelect
                  value={newIngUnit}
                  onChange={setNewIngUnit}
                  options={['kg', 'litre', 'pack', 'piece']}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Stock</label>
                <input type="number" min="0" step="0.01" value={newIngStock} onChange={e => setNewIngStock(e.target.value)} className="input-field text-sm" placeholder="0" required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Reorder Level</label>
                <input type="number" min="0" step="0.01" value={newIngReorder} onChange={e => setNewIngReorder(e.target.value)} className="input-field text-sm" placeholder="0" required />
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={loading} className="btn-primary text-sm px-6 py-3 w-full disabled:opacity-50">
                  {loading ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-plus mr-2" />Add</>}
                </button>
              </div>
            </form>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              {ingSel.selectedIds.length > 0 && <div className="px-4 pt-4"><BulkActionsBar count={ingSel.selectedIds.length} onClear={ingSel.clearSelection} onDelete={handleBulkDeleteIngredients} label="ingredients" /></div>}
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40, paddingLeft: 16 }}>
                      <input type="checkbox" className="table-checkbox" checked={ingredientFilters.filteredData.length > 0 && ingredientFilters.filteredData.every(i => ingSel.selectedIds.includes(i.id))} onChange={() => ingSel.toggleAll(ingredientFilters.filteredData.map(i => i.id))} />
                    </th>
                    <FilterableHeader label="Name" columnKey="name" type="text" filters={ingredientFilters.filters} setFilter={ingredientFilters.setFilter} clearFilter={ingredientFilters.clearFilter} openFilter={ingredientFilters.openFilter} setOpenFilter={ingredientFilters.setOpenFilter} columnOptions={ingredientFilters.columnOptions} getFilterLabel={ingredientFilters.getFilterLabel} />
                    <FilterableHeader label="Unit" columnKey="unit" type="select" filters={ingredientFilters.filters} setFilter={ingredientFilters.setFilter} clearFilter={ingredientFilters.clearFilter} openFilter={ingredientFilters.openFilter} setOpenFilter={ingredientFilters.setOpenFilter} columnOptions={ingredientFilters.columnOptions} getFilterLabel={ingredientFilters.getFilterLabel} />
                    <th>Stock</th>
                    <th>Reorder Level</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredientFilters.filteredData.length === 0 ? (
                    <tr><td colSpan="6" className="text-center text-gray-500 py-8">No ingredients.</td></tr>
                  ) : (
                    ingredientFilters.filteredData.map(ing => (
                      <tr key={ing.id} className={ingSel.selectedIds.includes(ing.id) ? 'bg-teal/5' : ''}>
                        <td style={{ paddingLeft: 16 }}>
                          <input type="checkbox" className="table-checkbox" checked={ingSel.selectedIds.includes(ing.id)} onChange={() => ingSel.toggleSelection(ing.id)} />
                        </td>
                        <td className="font-medium text-white">{ing.name}</td>
                        <td>{ing.unit}</td>
                        <td className={Number(ing.stock) <= Number(ing.reorder_level) ? 'text-red-400 font-semibold' : 'text-emerald-400 font-semibold'}>{ing.stock}</td>
                        <td>{ing.reorder_level}</td>
                        <td>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingItem({ type: 'ingredient', data: ing })} className="text-blue-400 hover:text-blue-300 text-sm cursor-pointer">
                              <i className="fas fa-pen-to-square" />
                            </button>
                            <button onClick={() => handleDeleteIngredient(ing)} className="text-red-400 hover:text-red-300 text-sm cursor-pointer">
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
        </div>
      )}

      {activeTab === 'recipes' && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-teal uppercase tracking-wider mb-4">
              <i className="fas fa-plus-circle mr-2" />Add Recipe
            </h3>
            <form onSubmit={handleAddRecipe} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Menu Item</label>
                <CustomSelect value={newRecipeMenuId} onChange={(val) => { setNewRecipeMenuId(val); setNewRecipeSize(''); }} options={menuItems.map(m => ({ value: m.id, label: m.name }))} placeholder="Select item" required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Size</label>
                <CustomSelect value={newRecipeSize} onChange={setNewRecipeSize} options={recipeSizeOptions} placeholder="Select size" required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Ingredient</label>
                <CustomSelect value={newRecipeIngId} onChange={setNewRecipeIngId} options={ingredients.map(i => ({ value: i.id, label: `${i.name} (${i.unit})` }))} placeholder="Select ingredient" required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Quantity Needed</label>
                <input type="number" min="0" step="0.01" value={newRecipeQty} onChange={e => setNewRecipeQty(e.target.value)} className="input-field text-sm" placeholder="0" required />
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={loading} className="btn-primary text-sm px-6 py-3 w-full disabled:opacity-50">
                  {loading ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-plus mr-2" />Add</>}
                </button>
              </div>
            </form>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              {recipeSel.selectedIds.length > 0 && <div className="px-4 pt-4"><BulkActionsBar count={recipeSel.selectedIds.length} onClear={recipeSel.clearSelection} onDelete={handleBulkDeleteRecipes} label="recipes" /></div>}
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40, paddingLeft: 16 }}>
                      <input type="checkbox" className="table-checkbox" checked={recipeFilters.filteredData.length > 0 && recipeFilters.filteredData.every(r => recipeSel.selectedIds.includes(r.id))} onChange={() => recipeSel.toggleAll(recipeFilters.filteredData.map(r => r.id))} />
                    </th>
                    <FilterableHeader label="Menu Item" columnKey="item_name" type="text" filters={recipeFilters.filters} setFilter={recipeFilters.setFilter} clearFilter={recipeFilters.clearFilter} openFilter={recipeFilters.openFilter} setOpenFilter={recipeFilters.setOpenFilter} columnOptions={recipeFilters.columnOptions} getFilterLabel={recipeFilters.getFilterLabel} />
                    <FilterableHeader label="Size" columnKey="size" type="text" filters={recipeFilters.filters} setFilter={recipeFilters.setFilter} clearFilter={recipeFilters.clearFilter} openFilter={recipeFilters.openFilter} setOpenFilter={recipeFilters.setOpenFilter} columnOptions={recipeFilters.columnOptions} getFilterLabel={recipeFilters.getFilterLabel} />
                    <FilterableHeader label="Ingredient" columnKey="ingredient_name" type="text" filters={recipeFilters.filters} setFilter={recipeFilters.setFilter} clearFilter={recipeFilters.clearFilter} openFilter={recipeFilters.openFilter} setOpenFilter={recipeFilters.setOpenFilter} columnOptions={recipeFilters.columnOptions} getFilterLabel={recipeFilters.getFilterLabel} />
                    <th>Qty Needed</th>
                    <th>Unit</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recipeFilters.filteredData.length === 0 ? (
                    <tr><td colSpan="7" className="text-center text-gray-500 py-8">No recipes. Click Add to create one.</td></tr>
                  ) : (
                    recipeFilters.filteredData.map(recipe => (
                      <tr key={recipe.id} className={recipeSel.selectedIds.includes(recipe.id) ? 'bg-teal/5' : ''}>
                        <td style={{ paddingLeft: 16 }}>
                          <input type="checkbox" className="table-checkbox" checked={recipeSel.selectedIds.includes(recipe.id)} onChange={() => recipeSel.toggleSelection(recipe.id)} />
                        </td>
                        <td className="font-medium text-white">{recipe.item_name}</td>
                        <td>{recipe.size}</td>
                        <td>{recipe.ingredient_name}</td>
                        <td className="text-teal font-semibold">{recipe.quantity_needed}</td>
                        <td>{recipe.unit}</td>
                        <td>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingItem({ type: 'recipe', data: recipe })} className="text-blue-400 hover:text-blue-300 text-sm cursor-pointer">
                              <i className="fas fa-pen-to-square" />
                            </button>
                            <button onClick={() => handleDeleteRecipe(recipe)} className="text-red-400 hover:text-red-300 text-sm cursor-pointer">
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
        </div>
      )}

      {editingItem?.type === 'menu' && (
        <EditMenuModal
          item={editingItem.data}
          onClose={() => setEditingItem(null)}
          onSaved={() => { setEditingItem(null); refreshData(); }}
        />
      )}
      {editingItem?.type === 'extra' && (
        <EditExtraModal
          extra={editingItem.data}
          onClose={() => setEditingItem(null)}
          onSaved={() => { setEditingItem(null); refreshData(); }}
        />
      )}
      {editingItem?.type === 'ingredient' && (
        <EditIngredientModal
          ingredient={editingItem.data}
          onClose={() => setEditingItem(null)}
          onSaved={() => { setEditingItem(null); refreshData(); }}
        />
      )}
      {editingItem?.type === 'recipe' && (
        <EditRecipeModal
          recipe={editingItem.data}
          onClose={() => setEditingItem(null)}
          onSaved={() => { setEditingItem(null); fetchRecipes(); }}
        />
      )}
    </div>
  );
}
