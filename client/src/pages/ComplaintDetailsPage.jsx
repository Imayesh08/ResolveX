import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  RotateCcw,
  Check,
  ShieldCheck,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  Lock,
  History,
  ShieldAlert,
  Paperclip
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import FeedbackForm from '../components/FeedbackForm';
import EvidenceSection from '../components/EvidenceSection';
import DuplicateSuggestionsPanel from '../components/DuplicateSuggestionsPanel';

const STATUS_OPTIONS = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'WAITING_FOR_CUSTOMER',
  'RESOLVED',
  'CLOSED'
];

const ComplaintDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab State: 'details' | 'timeline' | 'audit' | 'duplicates' | 'notes'
  const [activeTab, setActiveTab] = useState('details');

  // Status Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [resolutionDesc, setResolutionDesc] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Customer Reopen Modal State
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopening, setReopening] = useState(false);

  // Add Note State
  const [noteContent, setNoteContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);

  // Customer Feedback State
  const [feedback, setFeedback] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);

  // Duplicate Management State
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateSuggestions, setDuplicateSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedPrimaryTicket, setSelectedPrimaryTicket] = useState(null);
  const [primaryInputId, setPrimaryInputId] = useState('');
  const [duplicateReasonInput, setDuplicateReasonInput] = useState('');
  const [linkingDuplicate, setLinkingDuplicate] = useState(false);
  const [unlinkingDuplicate, setUnlinkingDuplicate] = useState(false);

  const fetchComplaintDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, fbRes, auditRes] = await Promise.all([
        api.get(`/complaints/${id}`),
        api.get(`/complaints/${id}/feedback`).catch(() => ({ data: { data: { feedback: null } } })),
        api.get(`/complaints/${id}/audit-trail`).catch(() => ({ data: { data: { auditTrail: [] } } }))
      ]);
      setComplaint(res.data.data.complaint);
      setNewStatus(res.data.data.complaint.status);
      setFeedback(fbRes.data?.data?.feedback || null);
      setAuditTrail(auditRes.data?.data?.auditTrail || []);
    } catch (err) {
      console.error('Failed to load complaint details:', err);
      const msg = err.response?.data?.message || 'Failed to load complaint.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchComplaintDetails();
  }, [fetchComplaintDetails]);

  // Handle Status Update (Staff & Admin)
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (newStatus === 'RESOLVED' && (!resolutionDesc || resolutionDesc.trim().length < 5)) {
      showToast('Resolution description is required when marking RESOLVED (min 5 chars).', 'warning');
      return;
    }

    setUpdatingStatus(true);
    try {
      await api.patch(`/complaints/${id}/status`, {
        status: newStatus,
        notes: statusNote,
        resolutionDescription: resolutionDesc
      });
      showToast(`Status updated to ${newStatus.replace(/_/g, ' ')}!`, 'success');
      setStatusModalOpen(false);
      setStatusNote('');
      setResolutionDesc('');
      fetchComplaintDetails();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update status.';
      showToast(msg, 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Customer Reopen
  const handleReopenSubmit = async (e) => {
    e.preventDefault();
    if (!reopenReason.trim() || reopenReason.trim().length < 5) {
      showToast('Please provide a specific reason for reopening (min 5 chars).', 'warning');
      return;
    }

    setReopening(true);
    try {
      await api.post(`/complaints/${id}/reopen`, { reason: reopenReason });
      showToast('Complaint reopened successfully!', 'success');
      setReopenModalOpen(false);
      setReopenReason('');
      fetchComplaintDetails();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reopen complaint.';
      showToast(msg, 'error');
    } finally {
      setReopening(false);
    }
  };

  // Handle Add Note (Staff & Admin)
  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setSubmittingNote(true);
    try {
      await api.post(`/complaints/${id}/notes`, {
        content: noteContent,
        isInternal: isInternalNote
      });
      showToast('Note added to record!', 'success');
      setNoteContent('');
      fetchComplaintDetails();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to post note.';
      showToast(msg, 'error');
    } finally {
      setSubmittingNote(false);
    }
  };

  // Duplicate Linking Handlers (Staff & Admin)
  const handleFetchDuplicateSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await api.get(`/complaints/${id}/duplicate-suggestions`);
      setDuplicateSuggestions(res.data.data.matches || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch duplicate suggestions.', 'error');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleLinkDuplicateSubmit = async (e) => {
    e.preventDefault();
    const targetPrimaryId = selectedPrimaryTicket?.complaintId || primaryInputId.trim();
    if (!targetPrimaryId) {
      showToast('Please select a suggested complaint or enter a primary complaint ID.', 'warning');
      return;
    }

    setLinkingDuplicate(true);
    try {
      await api.post(`/complaints/${id}/mark-duplicate`, {
        primaryComplaintId: targetPrimaryId,
        reason: duplicateReasonInput
      });
      showToast('Complaint confirmed and linked as duplicate!', 'success');
      setDuplicateModalOpen(false);
      setSelectedPrimaryTicket(null);
      setPrimaryInputId('');
      setDuplicateReasonInput('');
      fetchComplaintDetails();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to link duplicate.', 'error');
    } finally {
      setLinkingDuplicate(false);
    }
  };

  const handleUnlinkDuplicate = async () => {
    if (!window.confirm('Remove duplicate link and restore ticket to independent tracking?')) {
      return;
    }
    setUnlinkingDuplicate(true);
    try {
      await api.delete(`/complaints/${id}/mark-duplicate`);
      showToast('Duplicate relationship removed.', 'success');
      fetchComplaintDetails();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove duplicate link.', 'error');
    } finally {
      setUnlinkingDuplicate(false);
    }
  };

  if (loading) return <LoadingSpinner message="Retrieving complaint record from MongoDB..." />;

  if (error || !complaint) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <AlertCircle size={40} style={{ color: '#FF626C', margin: '0 auto 1rem auto' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF' }}>
          Complaint Record Not Found
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          {error || 'The requested ticket could not be located in the database.'}
        </p>
        <Link to="/complaints" className="btn btn-secondary" style={{ marginTop: '1.5rem' }}>
          <ArrowLeft size={16} /> Return to Complaints
        </Link>
      </div>
    );
  }

  const isResolvedOrClosed = ['RESOLVED', 'CLOSED'].includes(complaint.status);
  const canViewInternalNotes = user.role === 'admin' || user.role === 'staff';
  const isOwner =
    user?.role === 'customer' &&
    (complaint?.customer?._id === user?._id || complaint?.customer === user?._id);

  return (
    <div>
      {/* Back Link */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          to="/complaints"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)',
            fontWeight: 500,
            marginBottom: '0.75rem'
          }}
        >
          <ArrowLeft size={16} /> Back to Complaints List
        </Link>

        {/* Dossier Header Card matching lower-right reference panel */}
        <div
          style={{
            backgroundColor: 'var(--color-card)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            padding: '1.5rem 1.75rem',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1.25rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem', flexWrap: 'wrap' }}>
              <span className="ticket-number-cell" style={{ fontSize: '0.9375rem', padding: '0.3rem 0.65rem' }}>
                {complaint.ticketNumber}
              </span>
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.6rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  borderRadius: 'var(--radius-full)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 600
                }}
              >
                {complaint.category}
              </span>
            </div>

            <h1
              style={{
                fontSize: '1.625rem',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                lineHeight: 1.25
              }}
            >
              {complaint.title}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', flexWrap: 'wrap' }}>
              <span>Created: {new Date(complaint.createdAt).toLocaleString()}</span>
              {complaint.assignedTo && (
                <span>&bull; Assigned to: <strong style={{ color: '#4BA2FF' }}>{complaint.assignedTo.name}</strong></span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            {(user.role === 'admin' || user.role === 'staff') && (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setStatusModalOpen(true)}
                >
                  <CheckCircle2 size={16} /> Update Status
                </button>

                {!complaint.isDuplicate && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setDuplicateModalOpen(true);
                      handleFetchDuplicateSuggestions();
                    }}
                  >
                    <Layers size={16} /> Mark as Duplicate
                  </button>
                )}
              </>
            )}

            {user.role === 'customer' && isResolvedOrClosed && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setReopenModalOpen(true)}
              >
                <RotateCcw size={16} /> Reopen Complaint
              </button>
            )}
          </div>
        </div>

        {/* Confirmed Duplicate Notice Banner */}
        {complaint.isDuplicate && (
          <div
            style={{
              marginTop: '1rem',
              backgroundColor: 'rgba(255, 181, 71, 0.08)',
              border: '1px solid rgba(255, 181, 71, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <Layers size={22} style={{ color: '#FFB547', flexShrink: 0 }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <strong style={{ color: '#FFB547', fontSize: '0.9375rem' }}>Confirmed Duplicate Complaint</strong>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    Linked to primary complaint:
                  </span>
                  {complaint.duplicateOf && (
                    <Link
                      to={`/complaints/${complaint.duplicateOf._id}`}
                      style={{ color: '#4BA2FF', fontWeight: 700, textDecoration: 'none' }}
                    >
                      #{complaint.duplicateOf.ticketNumber} &mdash; {complaint.duplicateOf.title}
                    </Link>
                  )}
                </div>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  {complaint.duplicateReason ? `Reason: "${complaint.duplicateReason}"` : 'Marked as duplicate issue.'}
                  {complaint.duplicateMarkedBy && ` • Confirmed by ${complaint.duplicateMarkedBy.name}`}
                  {complaint.duplicateMarkedAt && ` on ${new Date(complaint.duplicateMarkedAt).toLocaleString()}`}
                </p>
              </div>
            </div>

            {(user.role === 'admin' || user.role === 'staff') && (
              <button
                type="button"
                onClick={handleUnlinkDuplicate}
                className="btn btn-secondary"
                style={{ fontSize: '0.8125rem', padding: '0.4rem 0.85rem' }}
                disabled={unlinkingDuplicate}
              >
                {unlinkingDuplicate ? 'Unlinking...' : 'Remove Duplicate Link'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab Navigation matching reference panel */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '1.5rem',
          paddingBottom: '0.25rem',
          overflowX: 'auto'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          style={{
            padding: '0.6rem 1.25rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            borderRadius: 'var(--radius-sm)',
            color: activeTab === 'details' ? '#FFFFFF' : 'var(--color-text-secondary)',
            backgroundColor: activeTab === 'details' ? 'rgba(22, 136, 255, 0.15)' : 'transparent',
            border: activeTab === 'details' ? '1px solid rgba(22, 136, 255, 0.35)' : '1px solid transparent',
            transition: 'var(--transition-smooth)'
          }}
        >
          Details
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          style={{
            padding: '0.6rem 1.25rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            borderRadius: 'var(--radius-sm)',
            color: activeTab === 'timeline' ? '#FFFFFF' : 'var(--color-text-secondary)',
            backgroundColor: activeTab === 'timeline' ? 'rgba(22, 136, 255, 0.15)' : 'transparent',
            border: activeTab === 'timeline' ? '1px solid rgba(22, 136, 255, 0.35)' : '1px solid transparent',
            transition: 'var(--transition-smooth)'
          }}
        >
          Status History & Updates ({complaint.statusHistory?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '0.6rem 1.25rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            borderRadius: 'var(--radius-sm)',
            color: activeTab === 'audit' ? '#FFFFFF' : 'var(--color-text-secondary)',
            backgroundColor: activeTab === 'audit' ? 'rgba(22, 136, 255, 0.15)' : 'transparent',
            border: activeTab === 'audit' ? '1px solid rgba(22, 136, 255, 0.35)' : '1px solid transparent',
            transition: 'var(--transition-smooth)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <ShieldAlert size={14} style={{ color: 'var(--color-electric-blue)' }} />
          Audit Trail ({auditTrail.length})
        </button>

        {canViewInternalNotes && (
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            style={{
              padding: '0.6rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              color: activeTab === 'notes' ? '#FFFFFF' : 'var(--color-text-secondary)',
              backgroundColor: activeTab === 'notes' ? 'rgba(22, 136, 255, 0.15)' : 'transparent',
              border: activeTab === 'notes' ? '1px solid rgba(22, 136, 255, 0.35)' : '1px solid transparent',
              transition: 'var(--transition-smooth)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Lock size={13} style={{ color: '#FFB547' }} />
            Internal Notes ({complaint.internalNotes?.length || 0})
          </button>
        )}

        {complaint.linkedDuplicates && complaint.linkedDuplicates.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('duplicates')}
            style={{
              padding: '0.6rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              color: activeTab === 'duplicates' ? '#FFFFFF' : 'var(--color-text-secondary)',
              backgroundColor: activeTab === 'duplicates' ? 'rgba(22, 136, 255, 0.15)' : 'transparent',
              border: activeTab === 'duplicates' ? '1px solid rgba(22, 136, 255, 0.35)' : '1px solid transparent',
              transition: 'var(--transition-smooth)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Layers size={13} style={{ color: '#FFB547' }} />
            Linked Duplicates ({complaint.linkedDuplicates.length})
          </button>
        )}
      </div>

      {/* Tab Content 1: Details */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)', gap: '1.5rem' }} className="details-grid-responsive">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Description Card */}
            <div className="card">
              <h2 className="card-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} style={{ color: 'var(--color-electric-blue)' }} /> Complaint Description
              </h2>
              <div
                style={{
                  fontSize: '0.9375rem',
                  lineHeight: 1.65,
                  color: 'var(--color-text-primary)',
                  whiteSpace: 'pre-wrap',
                  backgroundColor: 'var(--color-surface-inset)',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-subtle)'
                }}
              >
                {complaint.description}
              </div>
            </div>

            {/* Complaint Evidence & Attachments Dossier */}
            <EvidenceSection
              complaintId={complaint._id}
              attachments={complaint.attachments || []}
              isOwner={isOwner}
              userRole={user.role}
              complaintStatus={complaint.status}
              onAttachmentsUpdated={(updatedAtts) => {
                setComplaint((prev) => ({ ...prev, attachments: updatedAtts }));
              }}
            />

            {/* Official Resolution Card */}
            {complaint.resolution?.isResolved && (
              <div
                className="card"
                style={{
                  border: '1px solid rgba(25, 214, 154, 0.4)',
                  backgroundColor: 'rgba(25, 214, 154, 0.05)',
                  boxShadow: '0 0 20px rgba(25, 214, 154, 0.15)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.85rem' }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(25, 214, 154, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#19D69A'
                    }}
                  >
                    <Check size={18} strokeWidth={3} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#FFFFFF' }}>
                      Official Resolution Summary
                    </h2>
                    <div style={{ fontSize: '0.75rem', color: '#19D69A', fontWeight: 600 }}>
                      Resolved on {new Date(complaint.resolution.resolvedAt).toLocaleString()}
                      {complaint.resolution.resolvedBy?.name && ` by ${complaint.resolution.resolvedBy.name}`}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '0.9375rem',
                    lineHeight: 1.6,
                    color: 'var(--color-text-primary)',
                    backgroundColor: 'var(--color-surface-inset)',
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(25, 214, 154, 0.2)'
                  }}
                >
                  {complaint.resolution.description}
                </div>
              </div>
            )}

            {/* Customer Feedback and Experience Rating Section */}
            {(isResolvedOrClosed || feedback) && (
              <FeedbackForm
                complaintId={complaint._id}
                existingFeedback={feedback}
                isOwner={isOwner}
                userRole={user.role}
                onFeedbackSubmitted={(savedFb) => setFeedback(savedFb)}
              />
            )}
          </div>

          {/* Customer Info Card */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} style={{ color: 'var(--color-electric-blue)' }} /> Complainant Info
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <span className="form-label" style={{ marginBottom: '0.2rem', color: 'var(--color-text-tertiary)' }}>Name</span>
                <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{complaint.customer?.name}</div>
              </div>
              <div>
                <span className="form-label" style={{ marginBottom: '0.2rem', color: 'var(--color-text-tertiary)' }}>Email</span>
                <div style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>{complaint.customer?.email}</div>
              </div>
              {complaint.customer?.phone && (
                <div>
                  <span className="form-label" style={{ marginBottom: '0.2rem', color: 'var(--color-text-tertiary)' }}>Phone</span>
                  <div style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>{complaint.customer.phone}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Status History Timeline */}
      {activeTab === 'timeline' && (
        <div className="card" style={{ maxWidth: 880 }}>
          <h2 className="card-title" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={18} style={{ color: 'var(--color-electric-blue)' }} /> Recorded Status Timeline
          </h2>

          <div className="timeline">
            {complaint.statusHistory?.map((step, idx) => (
              <div key={idx} className="timeline-item">
                <div className={`timeline-marker ${step.status === 'RESOLVED' ? 'resolved' : ''}`} />
                <div className="timeline-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <StatusBadge status={step.status} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                      {new Date(step.changedAt).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    Changed by <strong style={{ color: '#FFFFFF' }}>{step.changedBy?.name || 'System Engine'}</strong>
                  </div>

                  {step.notes && (
                    <div style={{ fontSize: '0.8125rem', marginTop: '0.35rem', color: '#4BA2FF', fontStyle: 'italic' }}>
                      "{step.notes}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Immutable Activity Audit Trail */}
      {activeTab === 'audit' && (
        <div className="card" style={{ maxWidth: 900 }}>
          <div className="card-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={18} style={{ color: 'var(--color-electric-blue)' }} />
                Immutable Activity Audit Trail
              </h2>
              <p className="card-subtitle">
                Chronological, tamper-proof record of every administrative action, reassignment, and status transition
              </p>
            </div>
          </div>

          {auditTrail.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
              No audit records recorded yet for this complaint.
            </div>
          ) : (
            <div className="timeline">
              {auditTrail.map((entry, idx) => (
                <div key={idx} className="timeline-item">
                  <div
                    className="timeline-marker"
                    style={{
                      backgroundColor: entry.outcome === 'FAILURE' ? '#FF626C' : 'var(--color-electric-blue)',
                      boxShadow: entry.outcome === 'FAILURE' ? '0 0 10px rgba(255, 98, 108, 0.5)' : '0 0 10px rgba(22, 136, 255, 0.5)'
                    }}
                  />
                  <div className="timeline-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(22, 136, 255, 0.15)',
                          color: '#4BA2FF',
                          border: '1px solid rgba(22, 136, 255, 0.3)'
                        }}
                      >
                        {entry.action.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.875rem', color: '#FFFFFF', fontWeight: 500, marginBottom: '0.25rem' }}>
                      {entry.description}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Actor: <strong style={{ color: '#FFFFFF' }}>{entry.actor?.name || 'System Engine'}</strong></span>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>({entry.actorRole})</span>
                    </div>

                    {entry.changes && (
                      <div
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          backgroundColor: 'var(--color-surface-inset)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        {Object.entries(entry.changes).map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
                            <span style={{ color: '#4BA2FF' }}>{k}:</span>
                            {v && typeof v === 'object' && ('before' in v || 'after' in v) ? (
                              <span>
                                <span style={{ color: '#FF626C' }}>{String(v.before ?? 'none')}</span>
                                {' → '}
                                <span style={{ color: '#19D69A' }}>{String(v.after ?? 'none')}</span>
                              </span>
                            ) : (
                              <span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 3: Internal Notes (Staff & Admin) */}
      {activeTab === 'notes' && canViewInternalNotes && (
        <div className="card" style={{ maxWidth: 880 }}>
          <div className="card-header">
            <div>
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={16} style={{ color: '#FFB547' }} /> Internal Investigative Notes
              </h2>
              <p className="card-subtitle">Confidential annotations visible only to support staff and administrators</p>
            </div>
          </div>

          {/* Notes Thread */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', maxHeight: 350, overflowY: 'auto' }}>
            {(!complaint.internalNotes || complaint.internalNotes.length === 0) ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                No internal notes posted yet.
              </p>
            ) : (
              complaint.internalNotes.map((note, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: 'var(--color-surface-inset)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.8125rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <strong style={{ color: '#FFFFFF' }}>{note.author?.name || 'Staff Member'}</strong>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)' }}>
                      {new Date(note.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{note.content}</div>
                </div>
              ))
            )}
          </div>

          {/* Add Note Form */}
          <form onSubmit={handleNoteSubmit}>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Log internal triage note, engineering diagnosis, or ticket coordination..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                disabled={submittingNote}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-secondary btn-sm"
              disabled={submittingNote || !noteContent.trim()}
            >
              <Send size={14} /> {submittingNote ? 'Saving...' : 'Record Note'}
            </button>
          </form>
        </div>
      )}

      {/* Tab Content: Linked Duplicate Complaints */}
      {activeTab === 'duplicates' && (
        <div className="card" style={{ maxWidth: 900 }}>
          <div className="card-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={18} style={{ color: '#FFB547' }} />
                Linked Duplicate Complaints ({complaint.linkedDuplicates?.length || 0})
              </h2>
              <p className="card-subtitle">
                Secondary complaints confirmed to share root cause with this primary ticket
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {complaint.linkedDuplicates?.map((dup) => (
              <div
                key={dup._id}
                style={{
                  backgroundColor: 'var(--color-surface-inset)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                    <span className="ticket-number-cell" style={{ fontSize: '0.8125rem', padding: '0.2rem 0.5rem' }}>
                      #{dup.ticketNumber}
                    </span>
                    <StatusBadge status={dup.status} />
                    <span
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.15rem 0.5rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        borderRadius: 'var(--radius-full)',
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      {dup.category}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#FFFFFF' }}>
                    {dup.title}
                  </div>
                  {dup.duplicateReason && (
                    <div style={{ fontSize: '0.8125rem', color: '#A6B0BE', marginTop: '0.25rem', fontStyle: 'italic' }}>
                      Reason: "{dup.duplicateReason}"
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
                    Linked: {dup.duplicateMarkedAt ? new Date(dup.duplicateMarkedAt).toLocaleString() : 'N/A'}
                  </div>
                </div>

                <Link
                  to={`/complaints/${dup._id}`}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                >
                  Inspect Ticket
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Responsive Grid Media Query */}
      <style>{`
        @media (max-width: 960px) {
          .details-grid-responsive {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Status Update Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Update Lifecycle Status — ${complaint.ticketNumber}`}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setStatusModalOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStatusSubmit}
              disabled={updatingStatus}
            >
              {updatingStatus ? 'Updating...' : 'Commit Status Change'}
            </button>
          </>
        }
      >
        <form onSubmit={handleStatusSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="statusSelect">
              Target Resolution Status
            </label>
            <select
              id="statusSelect"
              className="form-control"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              required
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="statusNote">
              Status Change Reason / Notes
            </label>
            <textarea
              id="statusNote"
              className="form-control"
              rows={2}
              placeholder="e.g. Dispatched patch to API service; verifying latency reduction."
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
            />
          </div>

          {newStatus === 'RESOLVED' && (
            <div className="form-group">
              <label className="form-label" htmlFor="resDesc" style={{ color: '#19D69A', fontWeight: 600 }}>
                Official Resolution Description * (Visible to Customer)
              </label>
              <textarea
                id="resDesc"
                className="form-control"
                rows={3}
                placeholder="Explain the remedy implemented so the customer can verify resolution..."
                value={resolutionDesc}
                onChange={(e) => setResolutionDesc(e.target.value)}
                required
              />
            </div>
          )}
        </form>
      </Modal>

      {/* Customer Reopen Modal */}
      <Modal
        isOpen={reopenModalOpen}
        onClose={() => setReopenModalOpen(false)}
        title={`Reopen Ticket — ${complaint.ticketNumber}`}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setReopenModalOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleReopenSubmit}
              disabled={reopening}
            >
              {reopening ? 'Reopening...' : 'Confirm Reopen'}
            </button>
          </>
        }
      >
        <form onSubmit={handleReopenSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reopenReason">
              Why does this issue persist? *
            </label>
            <textarea
              id="reopenReason"
              className="form-control"
              rows={3}
              placeholder="Please explain why the resolution did not resolve your issue..."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              required
            />
          </div>
        </form>
      </Modal>

      {/* Staff / Admin Mark Duplicate Modal */}
      <Modal
        isOpen={duplicateModalOpen}
        onClose={() => {
          setDuplicateModalOpen(false);
          setSelectedPrimaryTicket(null);
        }}
        title={`Link Ticket #${complaint.ticketNumber} as Duplicate`}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setDuplicateModalOpen(false);
                setSelectedPrimaryTicket(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleLinkDuplicateSubmit}
              disabled={linkingDuplicate || (!selectedPrimaryTicket && !primaryInputId.trim())}
            >
              {linkingDuplicate ? 'Confirming Link...' : 'Confirm Duplicate Link'}
            </button>
          </>
        }
      >
        <form onSubmit={handleLinkDuplicateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            Linking this complaint to a primary ticket marks it as a confirmed duplicate. It preserves the original record and audit history while avoiding fragmented investigations.
          </p>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                Algorithmic Duplicate Suggestions
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem' }}
                onClick={handleFetchDuplicateSuggestions}
                disabled={loadingSuggestions}
              >
                {loadingSuggestions ? 'Scanning...' : 'Refresh Suggestions'}
              </button>
            </div>

            <DuplicateSuggestionsPanel
              matches={duplicateSuggestions}
              loading={loadingSuggestions}
              hasChecked={true}
              isStaffMode={true}
              onSelectPrimary={(match) => {
                setSelectedPrimaryTicket(match);
                setPrimaryInputId(match.complaintId || '');
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="primaryInput">
              Selected Primary Complaint *
            </label>
            <input
              id="primaryInput"
              type="text"
              className="form-control"
              placeholder="Select from suggestions above or enter MongoDB ObjectId"
              value={selectedPrimaryTicket ? `#${selectedPrimaryTicket.ticketNumber} — ${selectedPrimaryTicket.title}` : primaryInputId}
              onChange={(e) => {
                setSelectedPrimaryTicket(null);
                setPrimaryInputId(e.target.value);
              }}
              required
            />
            {selectedPrimaryTicket && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPrimaryTicket(null);
                  setPrimaryInputId('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FF626C',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  marginTop: '0.35rem',
                  padding: 0
                }}
              >
                Clear selection
              </button>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="duplicateReason">
              Reason / Justification Notes (Optional)
            </label>
            <textarea
              id="duplicateReason"
              className="form-control"
              rows={2}
              placeholder="e.g. Same root cause payment gateway failure; tracked under master ticket."
              value={duplicateReasonInput}
              onChange={(e) => setDuplicateReasonInput(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ComplaintDetailsPage;
