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
  { key: 'address', label: 'Address', type: 'text' },
];

export default function Customers() {
  const { showAlert, showConfirm } = useModal();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');

  const [editing, setEditing] = useState(null);
  const { filters, setFilter, clearFilter, openFilter, setOpenFilter, filteredData, columnOptions, getFilterLabel } = useTableFilters(customers, columns);
  const { selectedIds, toggleSelection, toggleAll, clearSelection } = useTableSelection();
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const fetchCustomers = () => {
    setLoading(true);
    api.get('customers')
      .then(res => setCustomers(Array.isArray(res) ? res : []))
      .catch(() => showAlert('error', 'Error', 'Failed to load customers.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      showAlert('warning', 'Required', 'Please enter a customer name.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('customers', {
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        address: newAddress.trim(),
      });
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewAddress('');
      fetchCustomers();
      showAlert('success', 'Added', 'Customer added successfully.');
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to add customer.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (customer) => {
    setEditing(customer);
    setEditName(customer.name || '');
    setEditPhone(customer.phone || '');
    setEditEmail(customer.email || '');
    setEditAddress(customer.address || '');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      showAlert('warning', 'Required', 'Please enter a customer name.');
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`customers/${editing.id}`, {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        address: editAddress.trim(),
      });
      setEditing(null);
      fetchCustomers();
      showAlert('success', 'Updated', 'Customer updated successfully.');
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to update customer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (customer) => {
    showConfirm('Delete Customer', `Delete customer "${customer.name}"?`, async () => {
      try {
        await api.delete(`customers/${customer.id}`);
        fetchCustomers();
      } catch (err) {
        showAlert('error', 'Error', err.message || 'Failed to delete customer.');
      }
    });
  };

  const handleBulkDelete = async () => {
    try {
      await api.post('customers/bulk-delete', { ids: selectedIds });
      clearSelection();
      fetchCustomers();
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to delete customers.');
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Customers</h1>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-teal uppercase tracking-wider mb-4">
          <i className="fas fa-plus-circle mr-2" />Add Customer
        </h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="input-field text-sm" placeholder="Customer name" required />
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
            <label className="block text-xs text-gray-400 mb-1">Address</label>
            <input type="text" value={newAddress} onChange={e => setNewAddress(e.target.value)} className="input-field text-sm" placeholder="Address" />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <button type="submit" disabled={submitting} className="btn-primary text-sm px-6 py-3 disabled:opacity-50">
              {submitting ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-plus mr-2" />Add Customer</>}
            </button>
          </div>
        </form>
      </div>

      <p className="text-sm text-gray-400">
        Showing <span className="text-white font-semibold">{filteredData.length}</span> customers
      </p>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {selectedIds.length > 0 && <div className="px-4 pt-4"><BulkActionsBar count={selectedIds.length} onClear={clearSelection} onDelete={handleBulkDelete} label="customers" /></div>}
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40, paddingLeft: 16 }}>
                  <input type="checkbox" className="table-checkbox" checked={filteredData.length > 0 && filteredData.every(c => selectedIds.includes(c.id))} onChange={() => toggleAll(filteredData.map(c => c.id))} />
                </th>
                <FilterableHeader label="Name" columnKey="name" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Phone" columnKey="phone" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Email" columnKey="email" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Address" columnKey="address" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-gray-500 py-8">No customers found.</td>
                </tr>
              ) : (
                filteredData.map(customer => (
                  <tr key={customer.id} className={selectedIds.includes(customer.id) ? 'bg-teal/5' : ''}>
                    <td style={{ paddingLeft: 16 }}>
                      <input type="checkbox" className="table-checkbox" checked={selectedIds.includes(customer.id)} onChange={() => toggleSelection(customer.id)} />
                    </td>
                    <td className="font-medium text-white">{customer.name}</td>
                    <td>{customer.phone || '—'}</td>
                    <td>{customer.email || '—'}</td>
                    <td>{customer.address || '—'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(customer)} className="text-blue-400 hover:text-blue-300 text-sm cursor-pointer">
                          <i className="fas fa-pen-to-square" />
                        </button>
                        <button onClick={() => handleDelete(customer)} className="text-red-400 hover:text-red-300 text-sm cursor-pointer">
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
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Edit Customer</h3>
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
                <label className="block text-xs text-gray-400 mb-1">Address</label>
                <input type="text" value={editAddress} onChange={e => setEditAddress(e.target.value)} className="input-field text-sm" />
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
