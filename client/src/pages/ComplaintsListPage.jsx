import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  PlusCircle,
  Eye,
  UserCheck,
  Archive,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';

const CATEGORIES = [
  'Technical Issue',
  'Billing and Payment',
  'Product or Service',
  'Account Access',
  'Delivery',
  'Other'
];

const STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const ComplaintsListPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Admin Assignment Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Admin Archive Modal State
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [complaintToArchive, setComplaintToArchive] = useState(null);
  const [archiving, setArchiving] = useState(false);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('limit', 10);
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (categoryFilter) params.append('category', categoryFilter);

      const res = await api.get(`/complaints?${params.toString()}`);
      setComplaints(res.data.data.complaints);
      setTotalCount(res.data.pagination.total);
      setTotalPages(res.data.pagination.pages || 1);
    } catch (err) {
      console.error('Failed to load complaints:', err);
      showToast('Error loading complaints list.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, priorityFilter, categoryFilter, showToast]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Load staff list for Admin assignment modal
  useEffect(() => {
    if (user.role === 'admin') {
      api.get('/users/staff')
        .then((res) => setStaffList(res.data.data.staff))
        .catch((err) => console.error('Failed to fetch staff list:', err));
    }
  }, [user.role]);

  const handleOpenAssignModal = (complaint) => {
    setSelectedComplaint(complaint);
    setSelectedStaffId(complaint.assignedTo?._id || '');
    setAssignNotes('');
    setAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStaffId) {
      showToast('Please select a support staff member.', 'warning');
      return;
    }

    setAssigning(true);
    try {
      await api.patch(`/complaints/${selectedComplaint._id}/assign`, {
        staffId: selectedStaffId,
        notes: assignNotes
      });
      showToast(`Complaint ${selectedComplaint.ticketNumber} assigned successfully!`, 'success');
      setAssignModalOpen(false);
      fetchComplaints();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to assign complaint.';
      showToast(msg, 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleOpenArchiveModal = (complaint) => {
    setComplaintToArchive(complaint);
    setArchiveModalOpen(true);
  };

  const handleArchiveConfirm = async () => {
    if (!complaintToArchive) return;
    setArchiving(true);
    try {
      await api.delete(`/complaints/${complaintToArchive._id}`);
      showToast(`Ticket ${complaintToArchive.ticketNumber} archived successfully.`, 'success');
      setArchiveModalOpen(false);
      fetchComplaints();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to archive complaint.';
      showToast(msg, 'error');
    } finally {
      setArchiving(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setCurrentPage(1);
  };

  return (
    <div>
      {/* Top Header */}
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
            {user.role === 'customer' ? 'My Complaints' : 'Complaint Queue'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            {user.role === 'customer'
              ? 'Real-time record of all issues lodged under your verified customer identity.'
              : 'Unified triage queue with search, multi-factor filtering, and administrative assignment.'}
          </p>
        </div>

        {user.role === 'customer' && (
          <Link to="/complaints/new" className="btn btn-primary">
            <PlusCircle size={18} /> Lodge Complaint
          </Link>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          backgroundColor: 'var(--color-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-card)'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
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
              placeholder="Search title, ticket #, description..."
              style={{ paddingLeft: '2.4rem' }}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((st) => (
              <option key={st} value={st}>
                {st.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            className="form-control"
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map((pr) => (
              <option key={pr} value={pr}>
                {pr} Priority
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            className="form-control"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Meta Row */}
        {(search || statusFilter || priorityFilter || categoryFilter) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1rem',
              paddingTop: '0.85rem',
              borderTop: '1px solid var(--color-border-subtle)',
              fontSize: '0.8125rem',
              color: 'var(--color-text-secondary)'
            }}
          >
            <span>Showing filtered results ({totalCount} total found)</span>
            <button
              onClick={handleResetFilters}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--color-electric-blue)', fontWeight: 600 }}
            >
              <RotateCcw size={14} /> Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Table or Loading/Empty State */}
      {loading ? (
        <LoadingSpinner message="Querying MongoDB complaint collection..." />
      ) : complaints.length === 0 ? (
        <EmptyState
          title="No complaints matched your query"
          description="Try broadening your filter criteria or clear the search input."
          action={
            (search || statusFilter || priorityFilter || categoryFilter) ? (
              <button onClick={handleResetFilters} className="btn btn-secondary btn-sm">
                <RotateCcw size={14} /> Reset Filters
              </button>
            ) : user.role === 'customer' ? (
              <Link to="/complaints/new" className="btn btn-primary btn-sm">
                <PlusCircle size={15} /> Submit a Complaint
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Complaint ID</th>
                  <th>Title & Category</th>
                  {user.role !== 'customer' && <th>Customer</th>}
                  <th>Priority</th>
                  <th>Status</th>
                  {user.role !== 'customer' && <th>Assignee</th>}
                  <th>Created At</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <span className="ticket-number-cell">{item.ticketNumber}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#FFFFFF', marginBottom: '0.2rem' }}>
                        {item.title}
                      </div>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--color-text-tertiary)',
                          fontWeight: 500
                        }}
                      >
                        {item.category}
                      </span>
                    </td>
                    {user.role !== 'customer' && (
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                          {item.customer?.name || 'Unknown'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                          {item.customer?.email}
                        </div>
                      </td>
                    )}
                    <td>
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    {user.role !== 'customer' && (
                      <td>
                        {item.assignedTo ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                backgroundColor: 'rgba(22, 136, 255, 0.2)',
                                color: '#4BA2FF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.65rem',
                                fontWeight: 700
                              }}
                            >
                              {item.assignedTo.name[0]}
                            </div>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                              {item.assignedTo.name}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78125rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                            Unassigned
                          </span>
                        )}
                      </td>
                    )}
                    <td style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8125rem' }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <Link to={`/complaints/${item._id}`} className="btn btn-secondary btn-sm" title="View details">
                          <Eye size={13} /> View
                        </Link>

                        {user.role === 'admin' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenAssignModal(item)}
                              title="Assign staff specialist"
                            >
                              <UserCheck size={13} /> Assign
                            </button>

                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ color: '#FF626C' }}
                              onClick={() => handleOpenArchiveModal(item)}
                              title="Soft delete / archive record"
                            >
                              <Archive size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--color-border)',
                backgroundColor: 'rgba(9, 13, 18, 0.6)'
              }}
            >
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>
                Page <span style={{ fontWeight: 600, color: '#FFFFFF' }}>{currentPage}</span> of{' '}
                <span style={{ fontWeight: 600, color: '#FFFFFF' }}>{totalPages}</span> ({totalCount} items)
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Assign Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Assign Specialist — ${selectedComplaint?.ticketNumber}`}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAssignSubmit}
              disabled={assigning}
            >
              {assigning ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </>
        }
      >
        <form onSubmit={handleAssignSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="staffSelect">
              Select Support Specialist
            </label>
            <select
              id="staffSelect"
              className="form-control"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              required
            >
              <option value="">-- Choose Support Staff Member --</option>
              {staffList.map((st) => (
                <option key={st._id} value={st._id}>
                  {st.name} ({st.department || 'Support'}) — {st.email}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="assignNotes">
              Assignment Directive / Instructions (Optional)
            </label>
            <textarea
              id="assignNotes"
              className="form-control"
              rows={3}
              placeholder="e.g. Assigned to Priya for urgent database network diagnosis."
              value={assignNotes}
              onChange={(e) => setAssignNotes(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* Admin Archive Confirmation Modal */}
      <Modal
        isOpen={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
        title="Confirm Ticket Archival"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setArchiveModalOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleArchiveConfirm}
              disabled={archiving}
            >
              {archiving ? 'Archiving...' : 'Yes, Archive Ticket'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
          Are you sure you want to archive ticket{' '}
          <strong style={{ fontFamily: 'var(--font-mono)', color: '#4BA2FF' }}>{complaintToArchive?.ticketNumber}</strong>?
        </p>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
          This will perform a soft deletion (<code style={{ color: '#1688FF' }}>isArchived = true</code>) in MongoDB. The complaint will no longer appear in active queues.
        </p>
      </Modal>
    </div>
  );
};

export default ComplaintsListPage;
