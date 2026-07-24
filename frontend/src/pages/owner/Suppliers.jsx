import { useState, useEffect } from 'react';
import { useModal } from '../../components/Modal';
import api from '../../api';
import { useTableFilters } from '../../hooks/useTableFilters';
import FilterableHeader from '../../components/FilterableHeader';
import useTableSelection from '../../hooks/useTableSelection';
import PageLoader from '../../components/PageLoader';
import BulkActionsBar from '../../components/BulkActionsBar';

const columns = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'text' },
];

export default function Suppliers() {
  const { showAlert, showConfirm } = useModal();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const [editing, setEditing] = useState(null);
  const { filters, setFilter, clearFilter, openFilter, setOpenFilter, filteredData, columnOptions, getFilterLabel } = useTableFilters(suppliers, columns);
  const { selectedIds, toggleSelection, toggleAll, clearSelection } = useTableSelection();
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const fetchSuppliers = () => {
    setLoading(true);
    api.get('suppliers')
      .then(res => setSuppliers(Array.isArray(res) ? res : []))
      .catch(() => showAlert('error', 'Error', 'Failed to load suppliers.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      showAlert('warning', 'Required', 'Please enter a supplier name.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('suppliers', {
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        notes: newNotes.trim(),
      });
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewNotes('');
      fetchSuppliers();
      showAlert('success', 'Added', 'Supplier added successfully.');
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to add supplier.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (supplier) => {
    setEditing(supplier);
    setEditName(supplier.name || '');
    setEditPhone(supplier.phone || '');
    setEditEmail(supplier.email || '');
    setEditNotes(supplier.notes || '');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      showAlert('warning', 'Required', 'Please enter a supplier name.');
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`suppliers/${editing.id}`, {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        notes: editNotes.trim(),
      });
      setEditing(null);
      fetchSuppliers();
      showAlert('success', 'Updated', 'Supplier updated successfully.');
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to update supplier.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (supplier) => {
    showConfirm('Delete Supplier', `Delete supplier "${supplier.name}"?`, async () => {
      try {
        await api.delete(`suppliers/${supplier.id}`);
        fetchSuppliers();
      } catch (err) {
        showAlert('error', 'Error', err.message || 'Failed to delete supplier.');
      }
    });
  };

  const handleBulkDelete = async () => {
    try {
      await api.post('suppliers/bulk-delete', { ids: selectedIds });
      clearSelection();
      fetchSuppliers();
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to delete suppliers.');
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Suppliers</h1>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-teal uppercase tracking-wider mb-4">
          <i className="fas fa-plus-circle mr-2" />Add Supplier
        </h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="input-field text-sm" placeholder="Supplier name" required />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Phone</label>
            <input type="text" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="input-field text-sm" placeholder="Phone number" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email</label>
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="input-field text-sm" placeholder="Email address" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes</label>
            <input type="text" value={newNotes} onChange={e => setNewNotes(e.target.value)} className="input-field text-sm" placeholder="Optional" />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <button type="submit" disabled={submitting} className="btn-primary text-sm px-6 py-3 disabled:opacity-50">
              {submitting ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-plus mr-2" />Add Supplier</>}
            </button>
          </div>
        </form>
      </div>

      <p className="text-sm text-gray-400">
        Showing <span className="text-white font-semibold">{filteredData.length}</span> suppliers
      </p>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {selectedIds.length > 0 && <div className="px-4 pt-4"><BulkActionsBar count={selectedIds.length} onClear={clearSelection} onDelete={handleBulkDelete} label="suppliers" /></div>}
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40, paddingLeft: 16 }}>
                  <input type="checkbox" className="table-checkbox" checked={filteredData.length > 0 && filteredData.every(s => selectedIds.includes(s.id))} onChange={() => toggleAll(filteredData.map(s => s.id))} />
                </th>
                <FilterableHeader label="Name" columnKey="name" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Phone" columnKey="phone" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Email" columnKey="email" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Notes" columnKey="notes" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-gray-500 py-8">No suppliers found.</td>
                </tr>
              ) : (
                filteredData.map(supplier => (
                  <tr key={supplier.id} className={selectedIds.includes(supplier.id) ? 'bg-teal/5' : ''}>
                    <td style={{ paddingLeft: 16 }}>
                      <input type="checkbox" className="table-checkbox" checked={selectedIds.includes(supplier.id)} onChange={() => toggleSelection(supplier.id)} />
                    </td>
                    <td className="font-medium text-white">{supplier.name}</td>
                    <td>{supplier.phone || '—'}</td>
                    <td>{supplier.email || '—'}</td>
                    <td>{supplier.notes || '—'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(supplier)} className="text-blue-400 hover:text-blue-300 text-sm cursor-pointer">
                          <i className="fas fa-pen-to-square" />
                        </button>
                        <button onClick={() => handleDelete(supplier)} className="text-red-400 hover:text-red-300 text-sm cursor-pointer">
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

      {editing && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div
            className="relative backdrop-blur-xl rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glow)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Edit Supplier</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="input-field text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Phone</label>
                <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email</label>
                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notes</label>
                <input type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)} className="input-field text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="btn-secondary text-sm px-4 py-2.5 flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary text-sm px-4 py-2.5 flex-1 disabled:opacity-50">
                  {submitting ? <i className="fas fa-spinner fa-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
