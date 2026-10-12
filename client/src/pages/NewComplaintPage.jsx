import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Send, ArrowLeft, AlertCircle, Info, Sparkles, CheckCircle2, Paperclip, Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { formatBytes } from '../components/EvidenceSection';
import DuplicateSuggestionsPanel from '../components/DuplicateSuggestionsPanel';

const CATEGORIES = [
  'Technical Issue',
  'Billing and Payment',
  'Product or Service',
  'Account Access',
  'Delivery',
  'Other'
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low', desc: 'Cosmetic inquiry or minor question', color: '#19D69A' },
  { value: 'MEDIUM', label: 'Medium', desc: 'Standard service impairment', color: '#1688FF' },
  { value: 'HIGH', label: 'High', desc: 'Major capability impediment', color: '#FFB547' },
  { value: 'URGENT', label: 'Urgent', desc: 'Critical system outage or blocker', color: '#FF626C' }
];

const NewComplaintPage = () => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'Technical Issue',
    priority: 'MEDIUM',
    description: ''
  });

  const [stagedFiles, setStagedFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Real-time Duplicate Detection State
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [hasCheckedDuplicates, setHasCheckedDuplicates] = useState(false);
  const [dismissedDuplicates, setDismissedDuplicates] = useState(false);

  const navigate = useNavigate();
  const { showToast } = useToast();

  // Debounced duplicate detection
  useEffect(() => {
    if (formData.title.trim().length < 5 || formData.description.trim().length < 10) {
      setDuplicateMatches([]);
      setHasCheckedDuplicates(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCheckingDuplicates(true);
      try {
        const res = await api.post(
          '/complaints/check-duplicates',
          {
            title: formData.title,
            description: formData.description,
            category: formData.category
          },
          { signal: controller.signal }
        );
        setDuplicateMatches(res.data.data.matches || []);
        setHasCheckedDuplicates(true);
        setDismissedDuplicates(false);
      } catch (err) {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
          console.debug('Duplicate check skipped:', err.message);
        }
      } finally {
        setCheckingDuplicates(false);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [formData.title, formData.description, formData.category]);

  const handleFileSelect = (filesList) => {
    const remainingSlots = 5 - stagedFiles.length;
    if (remainingSlots <= 0) {
      showToast('Maximum 5 attachments allowed per complaint.', 'warning');
      return;
    }

    const newFiles = Array.from(filesList).slice(0, remainingSlots);
    const validFiles = [];

    for (const file of newFiles) {
      const ext = `.${file.name.split('.').pop().toLowerCase()}`;
      if (!['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.txt', '.log'].includes(ext)) {
        showToast(`"${file.name}" has an unsupported format. Allowed: JPG, PNG, WEBP, PDF, TXT.`, 'error');
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast(`"${file.name}" exceeds the 5 MB limit.`, 'error');
        continue;
      }
      if (file.size === 0) {
        showToast(`"${file.name}" is empty (0 bytes).`, 'error');
        continue;
      }
      validFiles.push(file);
    }

    setStagedFiles((prev) => [...prev, ...validFiles]);
  };

  const removeStagedFile = (idx) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim() || formData.title.trim().length < 5) {
      errs.title = 'Title must be at least 5 characters long.';
    } else if (formData.title.trim().length > 120) {
      errs.title = 'Title cannot exceed 120 characters.';
    }

    if (!formData.description.trim() || formData.description.trim().length < 10) {
      errs.description = 'Detailed description must be at least 10 characters long.';
    } else if (formData.description.trim().length > 2000) {
      errs.description = 'Description cannot exceed 2000 characters.';
    }

    if (!formData.category) {
      errs.category = 'Please select a complaint category.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await api.post('/complaints', formData);
      const newTicket = res.data.data.complaint;

      if (stagedFiles.length > 0) {
        try {
          const uploadData = new FormData();
          stagedFiles.forEach((file) => uploadData.append('files', file));
          await api.post(`/complaints/${newTicket._id}/attachments`, uploadData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          showToast(`Complaint #${newTicket.ticketNumber} and ${stagedFiles.length} attachment(s) logged!`, 'success');
        } catch (attachErr) {
          const attachMsg = attachErr.response?.data?.message || 'Evidence upload encountered an issue, but complaint was saved.';
          showToast(attachMsg, 'warning');
        }
      } else {
        showToast(`Complaint #${newTicket.ticketNumber} submitted successfully!`, 'success');
      }

      navigate(`/complaints/${newTicket._id}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit complaint. Please check fields.';
      setServerError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      {/* Header matching lower-middle reference panel */}
      <div style={{ marginBottom: '1.75rem' }}>
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
          <ArrowLeft size={16} /> Back to Complaints
        </Link>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '-0.025em'
          }}
        >
          Submit a Complaint
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Please fill out the details below. Our support engineering specialists will investigate and resolve your issue.
        </p>
      </div>

      {serverError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.875rem 1rem',
            backgroundColor: 'rgba(255, 98, 108, 0.12)',
            border: '1px solid rgba(255, 98, 108, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: '#FF626C',
            fontSize: '0.875rem',
            marginBottom: '1.5rem'
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{serverError}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }} className="new-complaint-grid">
        {/* Form Container */}
        <div
          style={{
            backgroundColor: 'var(--color-card)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            padding: '2rem',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <form onSubmit={handleSubmit} noValidate>
            {/* Complaint Title */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label className="form-label" htmlFor="title">
                  Complaint Title *
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                  {formData.title.length}/120
                </span>
              </div>
              <input
                id="title"
                name="title"
                type="text"
                className="form-control"
                placeholder="e.g. Transaction settlement failure on gateway #3402"
                value={formData.title}
                onChange={handleChange}
                disabled={submitting}
                maxLength={120}
              />
              {errors.title && <span className="form-error">{errors.title}</span>}
            </div>

            {/* Category */}
            <div className="form-group">
              <label className="form-label" htmlFor="category">
                Category *
              </label>
              <select
                id="category"
                name="category"
                className="form-control"
                value={formData.category}
                onChange={handleChange}
                disabled={submitting}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && <span className="form-error">{errors.category}</span>}
            </div>

            {/* Priority Selector */}
            <div className="form-group">
              <label className="form-label">Priority *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.625rem' }}>
                {PRIORITIES.map((pri) => {
                  const selected = formData.priority === pri.value;
                  return (
                    <button
                      key={pri.value}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, priority: pri.value }))}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: selected ? `1px solid ${pri.color}` : '1px solid var(--color-border)',
                        backgroundColor: selected ? `${pri.color}15` : 'var(--color-surface-inset)',
                        boxShadow: selected ? `0 0 12px ${pri.color}30` : 'none',
                        textAlign: 'left',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: pri.color }} />
                        <strong style={{ fontSize: '0.8125rem', color: '#FFFFFF' }}>{pri.label}</strong>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>{pri.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label className="form-label" htmlFor="description">
                  Description *
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                  {formData.description.length}/2000
                </span>
              </div>
              <textarea
                id="description"
                name="description"
                rows={6}
                className="form-control"
                placeholder="Please describe the issue in detail, including steps to reproduce, timestamps, account numbers, and expected outcomes..."
                value={formData.description}
                onChange={handleChange}
                disabled={submitting}
                maxLength={2000}
              />
              {errors.description && <span className="form-error">{errors.description}</span>}
            </div>

            {/* Evidence & Attachments Dropzone */}
            <div className="form-group" style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                <label className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Paperclip size={15} style={{ color: 'var(--color-electric-blue)' }} /> Supporting Evidence (Optional)
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                  {stagedFiles.length}/5 files
                </span>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files) handleFileSelect(e.dataTransfer.files);
                }}
                onClick={() => document.getElementById('new-complaint-file-input')?.click()}
                style={{
                  padding: '1.25rem 1rem',
                  textAlign: 'center',
                  backgroundColor: dragOver ? 'rgba(22, 136, 255, 0.1)' : 'var(--color-surface-inset)',
                  borderRadius: 'var(--radius-sm)',
                  border: dragOver ? '2px dashed #1688FF' : '2px dashed var(--color-border-subtle)',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <input
                  id="new-complaint-file-input"
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.log"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files) handleFileSelect(e.target.files);
                  }}
                  disabled={submitting}
                />
                <Upload size={24} style={{ color: 'var(--color-electric-blue)', margin: '0 auto 0.4rem auto' }} />
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#FFFFFF' }}>
                  Click to browse files or drag and drop here
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                  Images (JPG, PNG, WebP), PDFs, and Logs &bull; Max 5 MB each &bull; Up to 5 files
                </div>
              </div>

              {/* Staged files list */}
              {stagedFiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
                  {stagedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.75rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8125rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                        <Paperclip size={13} style={{ color: '#4BA2FF', flexShrink: 0 }} />
                        <span style={{ color: '#FFFFFF', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </span>
                        <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.72rem' }}>
                          ({formatBytes(file.size)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStagedFile(idx);
                        }}
                        style={{ background: 'none', border: 'none', color: '#FF626C', cursor: 'pointer', padding: '0.2rem' }}
                        title="Remove file"
                        disabled={submitting}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Real-Time Duplicate Suggestions Warning Panel */}
            {!dismissedDuplicates && (
              <DuplicateSuggestionsPanel
                matches={duplicateMatches}
                loading={checkingDuplicates}
                hasChecked={hasCheckedDuplicates}
                onDismiss={() => setDismissedDuplicates(true)}
              />
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, padding: '0.75rem' }}
                disabled={submitting}
              >
                {submitting ? 'Submitting Complaint...' : <><Send size={17} /> Submit Complaint</>}
              </button>
              <Link to="/complaints" className="btn btn-secondary">
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Right Info Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            style={{
              backgroundColor: 'var(--color-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <Sparkles size={17} style={{ color: 'var(--color-electric-blue)' }} />
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#FFFFFF' }}>
                Submission Guidelines
              </h3>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <CheckCircle2 size={15} style={{ color: '#19D69A', flexShrink: 0, marginTop: '2px' }} />
                <span>Specify exact transaction or order reference IDs.</span>
              </li>
              <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <CheckCircle2 size={15} style={{ color: '#19D69A', flexShrink: 0, marginTop: '2px' }} />
                <span>Include error codes or messages encountered.</span>
              </li>
              <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <CheckCircle2 size={15} style={{ color: '#19D69A', flexShrink: 0, marginTop: '2px' }} />
                <span>Explain expected vs actual outcomes clearly.</span>
              </li>
            </ul>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface-inset)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(22, 136, 255, 0.25)',
              padding: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <Info size={17} style={{ color: 'var(--color-electric-blue)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.8125rem', color: '#A6B0BE', lineHeight: 1.5 }}>
                Your ticket will receive a deterministic tracking ID (e.g. <code style={{ color: '#4BA2FF' }}>RX-YYYYMMDD-XXXX</code>) stored in MongoDB for transparent SLA tracking.
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 800px) {
          .new-complaint-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default NewComplaintPage;
