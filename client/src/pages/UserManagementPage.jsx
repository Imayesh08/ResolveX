import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  Search,
  CheckCircle,
  XCircle,
  UserCheck,
  Shield,
  Users,
  Briefcase,
  Edit
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';

const DEPARTMENTS = [
  'Technical Support',
  'Billing',
  'Customer Operations',
  'General',
  'Administration'
];

const UserManagementPage = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Create User Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    department: 'Technical Support',
    phone: ''
  });
  const [creating, setCreating] = useState(false);

  // Edit Role Modal State
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [updatedRole, setUpdatedRole] = useState('');
  const [updatedDept, setUpdatedDept] = useState('');
  const [updatingRole, setUpdatingRole] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (roleFilter) params.append('role', roleFilter);
      params.append('limit', 50);

      const res = await api.get(`/users?${params.toString()}`);
      setUsers(res.data.data.users);
    } catch (err) {
      console.error('Failed to load users:', err);
      showToast('Error loading users list.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) {
      showToast('Please fill out all required fields.', 'warning');
      return;
    }

    setCreating(true);
    try {
      await api.post('/users', newUser);
      showToast(`${newUser.role.toUpperCase()} account created successfully!`, 'success');
      setCreateModalOpen(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        department: 'Technical Support',
        phone: ''
      });
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create user.';
      showToast(msg, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (targetUser) => {
    try {
      if (targetUser.isActive) {
        await api.delete(`/users/${targetUser._id}`);
        showToast(`User ${targetUser.name} deactivated.`, 'success');
      } else {
        await api.patch(`/users/${targetUser._id}`, { isActive: true });
        showToast(`User ${targetUser.name} reactivated.`, 'success');
      }
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to modify user status.';
      showToast(msg, 'error');
    }
  };

  const handleOpenEditRole = (targetUser) => {
    setEditingUser(targetUser);
    setUpdatedRole(targetUser.role);
    setUpdatedDept(targetUser.department || 'General');
    setEditRoleModalOpen(true);
  };

  const handleEditRoleSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setUpdatingRole(true);
    try {
      await api.patch(`/users/${editingUser._id}`, {
        role: updatedRole,
        department: updatedDept
      });
      showToast(`Updated permissions for ${editingUser.name}!`, 'success');
      setEditRoleModalOpen(false);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update user profile.';
      showToast(msg, 'error');
    } finally {
      setUpdatingRole(false);
    }
  };

  const totalUsers = users.length;
  const staffCount = users.filter((u) => u.role === 'staff').length;
  const customerCount = users.filter((u) => u.role === 'customer').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.025em'
            }}
          >
            User & Staff Governance
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Administrative directory: provision staff specialists, adjust RBAC permissions, and manage account statuses.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setCreateModalOpen(true)}
        >
          <UserPlus size={17} /> Provision User Account
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stat-grid">
        <StatCard title="Total Accounts" value={totalUsers} icon={Users} color="blue" subtext="Registered across system" />
        <StatCard title="Support Specialists" value={staffCount} icon={Briefcase} color="teal" subtext="Active staff triage team" />
        <StatCard title="Customer Accounts" value={customerCount} icon={UserCheck} color="green" subtext="Verified complainants" />
        <StatCard title="Administrators" value={adminCount} icon={Shield} color="rose" subtext="Full governance privileges" />
      </div>

      {/* Filter Bar */}
      <div
        style={{
          backgroundColor: 'var(--color-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-tertiary)'
            }}
          />
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, email, department..."
            style={{ paddingLeft: '2.4rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-control"
          style={{ width: 'auto', minWidth: 160 }}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="admin">Administrators</option>
          <option value="staff">Support Staff</option>
          <option value="customer">Customers</option>
        </select>
      </div>

      {/* Users Table */}
      {loading ? (
        <LoadingSpinner message="Querying user directory..." />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Identity & Name</th>
                  <th>Contact Email</th>
                  <th>System Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const initials = u.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
                  const roleStyle =
                    u.role === 'admin'
                      ? { bg: 'rgba(255, 98, 108, 0.15)', color: '#FF626C' }
                      : u.role === 'staff'
                      ? { bg: 'rgba(22, 136, 255, 0.15)', color: '#4BA2FF' }
                      : { bg: 'rgba(25, 214, 154, 0.15)', color: '#19D69A' };

                  return (
                    <tr key={u._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 'var(--radius-xs)',
                              backgroundColor: roleStyle.bg,
                              color: roleStyle.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.75rem'
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{u.name}</div>
                            {u.phone && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{u.phone}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-text-primary)' }}>{u.email}</td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: roleStyle.bg,
                            color: roleStyle.color,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                        {u.department || 'General'}
                      </td>
                      <td>
                        {u.isActive ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#19D69A', fontSize: '0.8125rem', fontWeight: 600 }}>
                            <CheckCircle size={14} /> Active
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#FF626C', fontSize: '0.8125rem', fontWeight: 600 }}>
                            <XCircle size={14} /> Deactivated
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEditRole(u)}
                            title="Edit Role & Department"
                          >
                            <Edit size={13} /> Edit
                          </button>

                          <button
                            type="button"
                            className={`btn btn-sm ${u.isActive ? 'btn-ghost' : 'btn-primary'}`}
                            style={u.isActive ? { color: '#FF626C' } : {}}
                            onClick={() => handleToggleActive(u)}
                            title={u.isActive ? 'Deactivate Account' : 'Reactivate Account'}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Provision User Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Provision New User Account"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleCreateSubmit} disabled={creating}>
              {creating ? 'Creating...' : 'Create Account'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="newUserName">Full Name *</label>
            <input
              id="newUserName"
              type="text"
              className="form-control"
              placeholder="e.g. Anandha Kumar"
              value={newUser.name}
              onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="newUserEmail">Email Address *</label>
            <input
              id="newUserEmail"
              type="email"
              className="form-control"
              placeholder="anandha@resolvex.local"
              value={newUser.email}
              onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="newUserPass">Temporary Password *</label>
            <input
              id="newUserPass"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={newUser.password}
              onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="newUserRole">System Access Role *</label>
            <select
              id="newUserRole"
              className="form-control"
              value={newUser.role}
              onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
            >
              <option value="staff">Support Staff</option>
              <option value="admin">Administrator</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="newUserDept">Department Classification</label>
            <select
              id="newUserDept"
              className="form-control"
              value={newUser.department}
              onChange={(e) => setNewUser((p) => ({ ...p, department: e.target.value }))}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="newUserPhone">Phone Number</label>
            <input
              id="newUserPhone"
              type="tel"
              className="form-control"
              placeholder="9840012345"
              value={newUser.phone}
              onChange={(e) => setNewUser((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>
        </form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={editRoleModalOpen}
        onClose={() => setEditRoleModalOpen(false)}
        title={`Edit Permissions: ${editingUser?.name}`}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setEditRoleModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleEditRoleSubmit} disabled={updatingRole}>
              {updatingRole ? 'Updating...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form onSubmit={handleEditRoleSubmit}>
          <div className="form-group">
            <label className="form-label">Role Privilege</label>
            <select
              className="form-control"
              value={updatedRole}
              onChange={(e) => setUpdatedRole(e.target.value)}
            >
              <option value="customer">Customer</option>
              <option value="staff">Support Staff</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Assigned Department</label>
            <select
              className="form-control"
              value={updatedDept}
              onChange={(e) => setUpdatedDept(e.target.value)}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagementPage;
