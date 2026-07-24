import { useState, useEffect } from 'react';
import { useModal } from '../../components/Modal';
import api from '../../api';
import EditUserModal from '../../modals/EditUserModal';
import { useTableFilters } from '../../hooks/useTableFilters';
import FilterableHeader from '../../components/FilterableHeader';
import CustomSelect from '../../components/CustomSelect';
import useTableSelection from '../../hooks/useTableSelection';
import PageLoader from '../../components/PageLoader';
import BulkActionsBar from '../../components/BulkActionsBar';

const columns = [
  { key: 'fullname', label: 'Full Name', type: 'text' },
  { key: 'username', label: 'Username', type: 'text' },
  { key: 'role', label: 'Role', type: 'select' },
];

export default function StaffManager() {
  const { showAlert, showConfirm } = useModal();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { filters, setFilter, clearFilter, openFilter, setOpenFilter, filteredData, columnOptions, getFilterLabel } = useTableFilters(users, columns);
  const { selectedIds, toggleSelection, toggleAll, clearSelection } = useTableSelection();

  const [newFullname, setNewFullname] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('staff');

  const fetchUsers = () => {
    setLoading(true);
    api.get('users')
      .then(res => setUsers(Array.isArray(res) ? res : []))
      .catch(() => showAlert('error', 'Error', 'Failed to load users.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newFullname.trim() || !newUsername.trim() || !newPassword.trim()) {
      showAlert('warning', 'Required', 'All fields are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('users', {
        fullname: newFullname,
        username: newUsername,
        password: newPassword,
        role: newRole,
      });
      if (res?.success === false) {
        showAlert('error', 'Error', res.message || 'Failed to create user.');
      } else {
        setNewFullname('');
        setNewUsername('');
        setNewPassword('');
        setNewRole('staff');
        fetchUsers();
        showAlert('success', 'Added', 'User created successfully.');
      }
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (user) => {
    if (user.id === 1) {
      showAlert('warning', 'Not Allowed', 'Cannot delete the primary owner account.');
      return;
    }
    showConfirm('Delete User', `Delete user "${user.fullname}"?`, async () => {
      try {
        await api.delete(`users/${user.id}`);
        fetchUsers();
      } catch (err) {
        showAlert('error', 'Error', err.message || 'Failed to delete user.');
      }
    });
  };

  const handleBulkDelete = async () => {
    const toDelete = selectedIds.filter(id => id !== 1);
    if (toDelete.length === 0) { clearSelection(); return; }
    try {
      await api.post('users/bulk-delete', { ids: toDelete });
      clearSelection();
      fetchUsers();
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to delete users.');
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Staff Manager</h1>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-teal uppercase tracking-wider mb-4">
          <i className="fas fa-user-plus mr-2" />Add User
        </h3>
        <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Full Name</label>
            <input type="text" value={newFullname} onChange={e => setNewFullname(e.target.value)} className="input-field text-sm" placeholder="John Doe" required />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Username</label>
            <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="input-field text-sm" placeholder="johndoe" required />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input-field text-sm" placeholder="••••••" required />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Role</label>
            <CustomSelect value={newRole} onChange={setNewRole} options={['staff', 'owner']} placeholder="Select role" />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={submitting} className="btn-primary text-sm px-6 py-3 w-full disabled:opacity-50">
              {submitting ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-plus mr-2" />Add User</>}
            </button>
          </div>
        </form>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {selectedIds.length > 0 && <div className="px-4 pt-4"><BulkActionsBar count={selectedIds.length} onClear={clearSelection} onDelete={handleBulkDelete} label="users" /></div>}
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40, paddingLeft: 16 }}>
                  <input type="checkbox" className="table-checkbox" checked={filteredData.length > 0 && filteredData.filter(u => u.id !== 1).every(u => selectedIds.includes(u.id))} onChange={() => toggleAll(filteredData.filter(u => u.id !== 1).map(u => u.id))} />
                </th>
                <FilterableHeader label="Full Name" columnKey="fullname" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Username" columnKey="username" type="text" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <FilterableHeader label="Role" columnKey="role" type="select" filters={filters} setFilter={setFilter} clearFilter={clearFilter} openFilter={openFilter} setOpenFilter={setOpenFilter} columnOptions={columnOptions} getFilterLabel={getFilterLabel} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-gray-500 py-8">No users found.</td></tr>
              ) : (
                filteredData.map(u => (
                  <tr key={u.id} className={selectedIds.includes(u.id) ? 'bg-teal/5' : ''}>
                    <td style={{ paddingLeft: 16 }}>
                      {u.id !== 1 && <input type="checkbox" className="table-checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleSelection(u.id)} />}
                    </td>
                    <td className="font-medium text-white">{u.fullname}</td>
                    <td>{u.username}</td>
                    <td>
                      <span className={u.role === 'owner' ? 'badge-danger' : 'badge-success'}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingUser(u)} className="text-blue-400 hover:text-blue-300 text-sm cursor-pointer">
                          <i className="fas fa-pen-to-square" />
                        </button>
                        <button onClick={() => handleDelete(u)} className={`text-sm cursor-pointer ${u.id === 1 ? 'text-gray-600 cursor-not-allowed' : 'text-red-400 hover:text-red-300'}`}>
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

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); fetchUsers(); }}
        />
      )}
    </div>
  );
}
