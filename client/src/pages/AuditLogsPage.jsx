import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Calendar,
  Layers,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  ArrowRight,
  Copy,
  Check,
  Download
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'COMPLAINT_CREATED', label: 'Complaint Created' },
  { value: 'COMPLAINT_ASSIGNED', label: 'Complaint Assigned' },
  { value: 'COMPLAINT_REASSIGNED', label: 'Complaint Reassigned' },
  { value: 'COMPLAINT_STATUS_CHANGED', label: 'Status Changed' },
  { value: 'COMPLAINT_PRIORITY_CHANGED', label: 'Priority Changed' },
  { value: 'COMPLAINT_UPDATED', label: 'Complaint Updated' },
  { value: 'COMPLAINT_REOPENED', label: 'Complaint Reopened' },
  { value: 'COMPLAINT_ARCHIVED', label: 'Complaint Archived' },
  { value: 'USER_CREATED', label: 'User Created' },
  { value: 'USER_ROLE_CHANGED', label: 'User Role Changed' },
  { value: 'USER_STATUS_CHANGED', label: 'User Status Changed' },
  { value: 'USER_DELETED', label: 'User Deactivated' },
  { value: 'AUTH_LOGIN_SUCCESS', label: 'Login Success' },
  { value: 'AUTH_LOGIN_FAILED', label: 'Login Failed' }
];

const RESOURCE_OPTIONS = [
  { value: '', label: 'All Resources' },
  { value: 'Complaint', label: 'Complaint' },
  { value: 'User', label: 'User' },
  { value: 'Authentication', label: 'Authentication' },
  { value: 'System', label: 'System' }
];

const OUTCOME_OPTIONS = [
  { value: '', label: 'All Outcomes' },
  { value: 'SUCCESS', label: 'Success Only' },
  { value: 'FAILURE', label: 'Failures Only' }
];

const AuditLogsPage = () => {
  const { showToast } = useToast();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // '', 'today', 'week', 'month'

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [summary, setSummary] = useState({
    totalEvents: 0,
    complaintEvents: 0,
    userEvents: 0,
    authFailures: 0
  });

  // Details Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const fetchAuditLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (actionFilter) params.append('action', actionFilter);
      if (resourceFilter) params.append('resourceType', resourceFilter);
      if (outcomeFilter) params.append('outcome', outcomeFilter);

      // Date presets
      if (dateFilter) {
        const now = new Date();
        if (dateFilter === 'today') {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          params.append('startDate', start.toISOString());
        } else if (dateFilter === 'week') {
          const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          params.append('startDate', start.toISOString());
        } else if (dateFilter === 'month') {
          const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          params.append('startDate', start.toISOString());
        }
      }

      params.append('page', page);
      params.append('limit', limit);

      const res = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(res.data.data.logs);
      setPagination(res.data.pagination);
      if (res.data.summary) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      showToast('Error loading audit log records.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, actionFilter, resourceFilter, outcomeFilter, dateFilter, page, limit, showToast]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleResetFilters = () => {
    setSearch('');
    setActionFilter('');
    setResourceFilter('');
    setOutcomeFilter('');
    setDateFilter('');
    setPage(1);
  };

  const openLogDetails = (log) => {
    setSelectedLog(log);
    setDetailsModalOpen(true);
    setCopiedId(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    showToast('Copied to clipboard', 'info');
  };

  const exportCSV = () => {
    if (!logs.length) {
      showToast('No audit entries to export.', 'warning');
      return;
    }
    const headers = ['Timestamp', 'Action', 'Resource Type', 'Resource ID', 'Actor Email', 'Actor Role', 'Outcome', 'Description'];
    const rows = logs.map(l => [
      `"${new Date(l.createdAt).toISOString()}"`,
      `"${l.action}"`,
      `"${l.resourceType}"`,
      `"${l.resourceId || ''}"`,
      `"${l.actor?.email || ''}"`,
      `"${l.actorRole}"`,
      `"${l.outcome}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ResolveX_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Audit trail exported to CSV.', 'success');
  };

  const getActionBadgeColor = (action, outcome) => {
    if (outcome === 'FAILURE') {
      return { bg: 'rgba(255, 98, 108, 0.15)', text: '#FF626C', border: 'rgba(255, 98, 108, 0.3)' };
    }
    if (action.startsWith('COMPLAINT_')) {
      return { bg: 'rgba(22, 136, 255, 0.15)', text: '#4BA2FF', border: 'rgba(22, 136, 255, 0.3)' };
    }
    if (action.startsWith('USER_')) {
      return { bg: 'rgba(255, 181, 71, 0.15)', text: '#FFB547', border: 'rgba(255, 181, 71, 0.3)' };
    }
    if (action.startsWith('AUTH_')) {
      return { bg: 'rgba(25, 214, 154, 0.15)', text: '#19D69A', border: 'rgba(25, 214, 154, 0.3)' };
    }
    return { bg: 'rgba(166, 176, 190, 0.15)', text: '#A6B0BE', border: 'rgba(166, 176, 190, 0.3)' };
  };

  const getRolePill = (role) => {
    const map = {
      admin: { label: 'Admin', color: '#FF626C', bg: 'rgba(255, 98, 108, 0.15)' },
      staff: { label: 'Staff', color: '#4BA2FF', bg: 'rgba(22, 136, 255, 0.15)' },
      customer: { label: 'Customer', color: '#19D69A', bg: 'rgba(25, 214, 154, 0.15)' },
      system: { label: 'System', color: '#A6B0BE', bg: 'rgba(166, 176, 190, 0.15)' }
    };
    const conf = map[role] || map.system;
    return (
      <span
        style={{
          fontSize: '0.6875rem',
          padding: '0.15rem 0.45rem',
          borderRadius: 'var(--radius-full)',
          fontWeight: 700,
          backgroundColor: conf.bg,
          color: conf.color,
          display: 'inline-block'
        }}
      >
        {conf.label}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1
            style={{
              fontSize: '1.625rem',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem'
            }}
          >
            <ShieldAlert size={26} style={{ color: 'var(--color-electric-blue)' }} />
            Audit Logs & Accountability
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Centralized, immutable audit trail tracking complaint workflows, role changes, and security operations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={exportCSV}
            title="Export filtered audit logs as CSV"
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fetchAuditLogs(true)}
            disabled={refreshing}
            title="Refresh logs"
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="stats-grid">
        <StatCard
          title="Total Audit Events"
          value={summary.totalEvents.toLocaleString()}
          icon={FileText}
          color="blue"
          subtext="Append-only immutable records"
        />
        <StatCard
          title="Complaint Operations"
          value={summary.complaintEvents.toLocaleString()}
          icon={Layers}
          color="teal"
          subtext="Creations, assignments & status changes"
        />
        <StatCard
          title="User Governance"
          value={summary.userEvents.toLocaleString()}
          icon={Users}
          color="amber"
          subtext="Provisioning, roles & deactivations"
        />
        <StatCard
          title="Auth Failures"
          value={summary.authFailures.toLocaleString()}
          icon={AlertTriangle}
          color="rose"
          subtext="Security alerts & rejected logins"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', gridColumn: 'span 2' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-tertiary)',
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search description, resource ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>

          {/* Action Filter */}
          <div>
            <select
              className="form-input"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Resource Filter */}
          <div>
            <select
              className="form-input"
              value={resourceFilter}
              onChange={(e) => {
                setResourceFilter(e.target.value);
                setPage(1);
              }}
            >
              {RESOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Outcome Filter */}
          <div>
            <select
              className="form-input"
              value={outcomeFilter}
              onChange={(e) => {
                setOutcomeFilter(e.target.value);
                setPage(1);
              }}
            >
              {OUTCOME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <select
              className="form-input"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetFilters}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Audit Logs Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem 2rem', display: 'flex', justifyContent: 'center' }}>
            <LoadingSpinner message="Querying immutable audit logs..." />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <ShieldAlert size={48} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '0.5rem' }}>
              No audit log entries found
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', maxWidth: 420, margin: '0 auto 1.5rem auto' }}>
              No recorded system activities match the selected filter parameters.
            </p>
            <button type="button" className="btn btn-secondary" onClick={handleResetFilters}>
              Clear Active Filters
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>Timestamp</th>
                  <th style={{ width: '190px' }}>Actor</th>
                  <th style={{ width: '180px' }}>Action</th>
                  <th style={{ width: '140px' }}>Resource</th>
                  <th>Description</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Outcome</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const badgeStyle = getActionBadgeColor(log.action, log.outcome);
                  return (
                    <tr key={log._id}>
                      {/* Timestamp */}
                      <td style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                        <div style={{ color: '#FFFFFF', fontWeight: 500 }}>
                          {new Date(log.createdAt).toLocaleDateString()}
                        </div>
                        <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </div>
                      </td>

                      {/* Actor */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: 600, color: '#FFFFFF', fontSize: '0.875rem' }}>
                            {log.actor?.name || 'System / Unauth'}
                          </span>
                          {getRolePill(log.actorRole)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                          {log.actor?.email || log.metadata?.email || 'N/A'}
                        </div>
                      </td>

                      {/* Action */}
                      <td>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.55rem',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 700,
                            backgroundColor: badgeStyle.bg,
                            color: badgeStyle.text,
                            border: `1px solid ${badgeStyle.border}`,
                            display: 'inline-block',
                            letterSpacing: '0.02em'
                          }}
                        >
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Resource */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.8125rem' }}>
                            {log.resourceType}
                          </span>
                          {log.resourceId && (
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '0.7rem',
                                color: 'var(--color-text-tertiary)',
                                maxWidth: '120px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                              title={log.resourceId}
                            >
                              #{log.resourceId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Description */}
                      <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                        {log.description}
                      </td>

                      {/* Outcome */}
                      <td style={{ textAlign: 'center' }}>
                        {log.outcome === 'SUCCESS' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              backgroundColor: 'rgba(25, 214, 154, 0.15)',
                              color: '#19D69A'
                            }}
                          >
                            <CheckCircle size={11} /> OK
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              backgroundColor: 'rgba(255, 98, 108, 0.15)',
                              color: '#FF626C'
                            }}
                          >
                            <XCircle size={11} /> FAIL
                          </span>
                        )}
                      </td>

                      {/* Details Button */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => openLogDetails(log)}
                          style={{ padding: '0.35rem 0.55rem', borderRadius: 'var(--radius-sm)' }}
                          title="Inspect changes & metadata"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && logs.length > 0 && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--color-border-subtle)',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} records
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select
                className="form-input"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8125rem' }}
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem' }}
              >
                Previous
              </button>

              <span style={{ fontSize: '0.8125rem', color: '#FFFFFF', fontWeight: 600, padding: '0 0.5rem' }}>
                Page {page} of {pagination.pages || 1}
              </span>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={page >= pagination.pages}
                onClick={() => setPage((prev) => Math.min(pagination.pages, prev + 1))}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audit Detail & Diff Inspection Modal */}
      {selectedLog && (
        <Modal
          isOpen={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          title={`Audit Log Record Details`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header info strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.75rem',
                backgroundColor: 'var(--color-surface-inset)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-subtle)'
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', display: 'block' }}>Action</span>
                <span style={{ fontWeight: 700, color: '#4BA2FF', fontSize: '0.8125rem' }}>
                  {selectedLog.action}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', display: 'block' }}>Outcome</span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    color: selectedLog.outcome === 'SUCCESS' ? '#19D69A' : '#FF626C'
                  }}
                >
                  {selectedLog.outcome}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', display: 'block' }}>Resource</span>
                <span style={{ fontWeight: 600, color: '#FFFFFF', fontSize: '0.8125rem' }}>
                  {selectedLog.resourceType}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', display: 'block' }}>Timestamp</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="form-label" style={{ marginBottom: '0.35rem' }}>Event Description</label>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--color-surface-inset)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-subtle)',
                  color: '#FFFFFF',
                  fontSize: '0.875rem'
                }}
              >
                {selectedLog.description}
              </div>
            </div>

            {/* Actor Details */}
            <div>
              <label className="form-label" style={{ marginBottom: '0.35rem' }}>Accountability / Actor</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--color-surface-inset)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-subtle)',
                  fontSize: '0.8125rem'
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>Name: </span>
                  <strong style={{ color: '#FFFFFF' }}>{selectedLog.actor?.name || 'Unauthenticated / System'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>Email: </span>
                  <span style={{ color: '#4BA2FF' }}>{selectedLog.actor?.email || selectedLog.metadata?.email || 'N/A'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>Role: </span>
                  {getRolePill(selectedLog.actorRole)}
                </div>
                {selectedLog.actor?.department && (
                  <div>
                    <span style={{ color: 'var(--color-text-tertiary)' }}>Department: </span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{selectedLog.actor.department}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Structured Changes Before & After */}
            {selectedLog.changes && (
              <div>
                <label className="form-label" style={{ marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ArrowRight size={14} style={{ color: 'var(--color-electric-blue)' }} />
                  Recorded Changes (Before vs After)
                </label>
                <div
                  style={{
                    backgroundColor: 'var(--color-surface-inset)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border-subtle)',
                    overflow: 'hidden'
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'left', color: 'var(--color-text-tertiary)' }}>
                        <th style={{ padding: '0.5rem 0.85rem' }}>Property</th>
                        <th style={{ padding: '0.5rem 0.85rem' }}>Previous Value</th>
                        <th style={{ padding: '0.5rem 0.85rem' }}>Updated Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(selectedLog.changes).map(([key, val]) => {
                        const isDiff = val && typeof val === 'object' && ('before' in val || 'after' in val);
                        const beforeVal = isDiff ? String(val.before ?? 'None') : 'N/A';
                        const afterVal = isDiff ? String(val.after ?? 'None') : (typeof val === 'object' ? JSON.stringify(val) : String(val));

                        return (
                          <tr key={key} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <td style={{ padding: '0.5rem 0.85rem', fontWeight: 600, color: '#FFFFFF' }}>{key}</td>
                            <td style={{ padding: '0.5rem 0.85rem', color: '#FF626C', fontFamily: 'monospace' }}>
                              {beforeVal}
                            </td>
                            <td style={{ padding: '0.5rem 0.85rem', color: '#19D69A', fontFamily: 'monospace' }}>
                              {afterVal}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Request & Network Metadata */}
            <div>
              <label className="form-label" style={{ marginBottom: '0.35rem' }}>Network & Request Metadata</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--color-surface-inset)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-subtle)',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'monospace'
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>IP Address: </span>
                  <span style={{ color: '#FFFFFF' }}>{selectedLog.metadata?.ip || '127.0.0.1'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>HTTP Method: </span>
                  <span style={{ color: '#4BA2FF' }}>{selectedLog.metadata?.method || 'N/A'}</span>
                </div>
                <div style={{ gridColumn: 'span 2', wordBreak: 'break-all' }}>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>Route Path: </span>
                  <span>{selectedLog.metadata?.path || 'N/A'}</span>
                </div>
                {selectedLog.metadata?.userAgent && (
                  <div style={{ gridColumn: 'span 2', wordBreak: 'break-all', fontSize: '0.7rem' }}>
                    <span style={{ color: 'var(--color-text-tertiary)' }}>User-Agent: </span>
                    <span>{selectedLog.metadata.userAgent}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Resource Identifier Strip */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                Resource ID: <code style={{ color: '#FFFFFF' }}>{selectedLog.resourceId || 'None'}</code>
              </div>

              {selectedLog.resourceId && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => copyToClipboard(selectedLog.resourceId)}
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                >
                  {copiedId ? <Check size={13} style={{ color: '#19D69A' }} /> : <Copy size={13} />}
                  {copiedId ? 'Copied' : 'Copy Resource ID'}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AuditLogsPage;
