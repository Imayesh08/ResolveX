import React, { useState } from 'react';
import {
  Paperclip,
  Upload,
  FileText,
  Image as ImageIcon,
  FileCode,
  Download,
  Eye,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Plus,
  Lock
} from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_TOTAL_FILES = 5;
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.txt', '.log'];

export const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getFileIcon = (mimeType = '') => {
  if (mimeType.startsWith('image/')) {
    return <ImageIcon size={18} style={{ color: '#4BA2FF' }} />;
  }
  if (mimeType === 'application/pdf') {
    return <FileText size={18} style={{ color: '#FF626C' }} />;
  }
  return <FileCode size={18} style={{ color: '#FFB547' }} />;
};

const EvidenceSection = ({
  complaintId,
  attachments = [],
  isOwner = false,
  userRole = 'customer',
  complaintStatus = 'OPEN',
  onAttachmentsUpdated
}) => {
  const { showToast } = useToast();

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileDescription, setFileDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState({ url: null, name: '', mimeType: '', textContent: '' });
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Permission calculation:
  // Customers can upload if complaint is not resolved/closed
  // Staff can upload if assigned, Admin can upload anytime
  const canUpload =
    (isOwner && !['RESOLVED', 'CLOSED'].includes(complaintStatus)) ||
    userRole === 'staff' ||
    userRole === 'admin';

  // Customer can delete only while OPEN; Admin can delete anytime under retention
  const canDeleteAttachment = (att) => {
    if (userRole === 'admin') return true;
    if (isOwner && complaintStatus === 'OPEN') return true;
    return false;
  };

  const handleFileSelect = (filesList) => {
    const remainingSlots = MAX_TOTAL_FILES - (attachments.length + selectedFiles.length);
    if (remainingSlots <= 0) {
      showToast(`Maximum ${MAX_TOTAL_FILES} attachments allowed per complaint.`, 'warning');
      return;
    }

    const newFiles = Array.from(filesList).slice(0, remainingSlots);
    const validFiles = [];

    for (const file of newFiles) {
      // Validate extension
      const ext = `.${file.name.split('.').pop().toLowerCase()}`;
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        showToast(`"${file.name}" has an unsupported format. Allowed: JPG, PNG, WEBP, PDF, TXT.`, 'error');
        continue;
      }
      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        showToast(`"${file.name}" exceeds the 5 MB limit (${formatBytes(file.size)}).`, 'error');
        continue;
      }
      if (file.size === 0) {
        showToast(`"${file.name}" is empty (0 bytes).`, 'error');
        continue;
      }
      validFiles.push(file);
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      showToast('Please select at least one file to upload.', 'warning');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });
    if (fileDescription.trim()) {
      formData.append('description', fileDescription.trim());
    }

    try {
      const res = await api.post(`/complaints/${complaintId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showToast('Evidence uploaded successfully!', 'success');
      setUploadModalOpen(false);
      setSelectedFiles([]);
      setFileDescription('');

      // Refresh list
      const listRes = await api.get(`/complaints/${complaintId}/attachments`);
      if (onAttachmentsUpdated) {
        onAttachmentsUpdated(listRes.data.data.attachments);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to upload attachments.';
      showToast(msg, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Authenticated File Download
  const handleDownload = async (att) => {
    try {
      showToast(`Downloading ${att.originalName}...`, 'info');
      const res = await api.get(`/complaints/${complaintId}/attachments/${att._id}?download=true`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: att.mimeType }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', att.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      showToast('Failed to download file. Please verify access.', 'error');
    }
  };

  // Authenticated File Preview
  const handlePreview = async (att) => {
    setLoadingPreview(true);
    setPreviewModalOpen(true);
    setPreviewData({ url: null, name: att.originalName, mimeType: att.mimeType, textContent: '' });

    try {
      const res = await api.get(`/complaints/${complaintId}/attachments/${att._id}`, {
        responseType: att.mimeType === 'text/plain' ? 'text' : 'blob'
      });

      if (att.mimeType === 'text/plain') {
        setPreviewData({
          url: null,
          name: att.originalName,
          mimeType: att.mimeType,
          textContent: typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
        });
      } else {
        const objectUrl = window.URL.createObjectURL(new Blob([res.data], { type: att.mimeType }));
        setPreviewData({
          url: objectUrl,
          name: att.originalName,
          mimeType: att.mimeType,
          textContent: ''
        });
      }
    } catch (err) {
      console.error('Preview failed:', err);
      showToast('Unable to preview file. You can download it directly.', 'error');
      setPreviewModalOpen(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Close preview and revoke object URL
  const closePreview = () => {
    if (previewData.url) {
      window.URL.revokeObjectURL(previewData.url);
    }
    setPreviewModalOpen(false);
    setPreviewData({ url: null, name: '', mimeType: '', textContent: '' });
  };

  // Delete Attachment
  const handleDelete = async (attachmentId) => {
    setDeleting(true);
    try {
      await api.delete(`/complaints/${complaintId}/attachments/${attachmentId}`);
      showToast('Attachment deleted successfully.', 'success');
      setDeleteConfirmId(null);

      // Refresh list
      const listRes = await api.get(`/complaints/${complaintId}/attachments`);
      if (onAttachmentsUpdated) {
        onAttachmentsUpdated(listRes.data.data.attachments);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete attachment.';
      showToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Paperclip size={18} style={{ color: 'var(--color-electric-blue)' }} />
            Evidence & Attachments
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(22, 136, 255, 0.15)',
                color: '#4BA2FF',
                fontWeight: 700
              }}
            >
              {attachments.length} / {MAX_TOTAL_FILES}
            </span>
          </h2>
          <p className="card-subtitle">
            Screenshots, invoices, and diagnostic files supporting the complaint investigation
          </p>
        </div>

        {canUpload && attachments.length < MAX_TOTAL_FILES && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setUploadModalOpen(true)}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8125rem' }}
          >
            <Plus size={15} /> Attach Evidence
          </button>
        )}
      </div>

      {/* Attachment List */}
      {attachments.length === 0 ? (
        <div
          style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            backgroundColor: 'var(--color-surface-inset)',
            borderRadius: 'var(--radius-sm)',
            border: '1px dashed var(--color-border-subtle)'
          }}
        >
          <Paperclip size={36} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 0.75rem auto' }} />
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '0.25rem' }}>
            No evidence attachments uploaded yet
          </h4>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', maxWidth: 380, margin: '0 auto 1rem auto' }}>
            Upload supporting screenshots, receipts, or diagnostic logs to accelerate ticket resolution.
          </p>
          {canUpload && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setUploadModalOpen(true)}
              style={{ fontSize: '0.8125rem' }}
            >
              <Upload size={14} /> Upload Evidence
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {attachments.map((att) => (
            <div
              key={att._id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--color-surface-inset)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-subtle)',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 200, flex: 1 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {getFileIcon(att.mimeType)}
                </div>

                <div style={{ overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap'
                    }}
                    title={att.originalName}
                  >
                    {att.originalName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', display: 'flex', gap: '0.5rem' }}>
                    <span>{formatBytes(att.size)}</span>
                    <span>&bull;</span>
                    <span>{new Date(att.uploadedAt).toLocaleDateString()}</span>
                    {att.uploadedBy?.name && (
                      <>
                        <span>&bull;</span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>by {att.uploadedBy.name}</span>
                      </>
                    )}
                  </div>
                  {att.description && (
                    <div style={{ fontSize: '0.75rem', color: '#4BA2FF', marginTop: '0.2rem' }}>
                      "{att.description}"
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handlePreview(att)}
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                  title="View attachment"
                >
                  <Eye size={13} /> View
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleDownload(att)}
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                  title="Download attachment"
                >
                  <Download size={13} /> Download
                </button>

                {canDeleteAttachment(att) && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setDeleteConfirmId(att._id)}
                    style={{ padding: '0.35rem 0.55rem', color: '#FF626C' }}
                    title="Delete attachment"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <Modal
          isOpen={Boolean(deleteConfirmId)}
          onClose={() => setDeleteConfirmId(null)}
          title="Confirm Attachment Deletion"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <AlertCircle size={24} style={{ color: '#FF626C', flexShrink: 0 }} />
              <div>
                <h4 style={{ color: '#FFFFFF', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Permanently remove this evidence file?
                </h4>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                  This will delete the file from secure storage and record the deletion in the immutable audit log.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleting}
                style={{ backgroundColor: '#FF626C', borderColor: '#FF626C' }}
              >
                {deleting ? 'Deleting...' : 'Delete Evidence'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => {
          if (!uploading) {
            setUploadModalOpen(false);
            setSelectedFiles([]);
            setFileDescription('');
          }
        }}
        title="Attach Complaint Evidence"
      >
        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              padding: '2rem 1.5rem',
              textAlign: 'center',
              backgroundColor: dragOver ? 'rgba(22, 136, 255, 0.1)' : 'var(--color-surface-inset)',
              borderRadius: 'var(--radius-sm)',
              border: dragOver ? '2px dashed #1688FF' : '2px dashed var(--color-border-subtle)',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)'
            }}
            onClick={() => document.getElementById('evidence-file-input')?.click()}
          >
            <input
              id="evidence-file-input"
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.log"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files) handleFileSelect(e.target.files);
              }}
            />
            <Upload size={32} style={{ color: 'var(--color-electric-blue)', margin: '0 auto 0.75rem auto' }} />
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#FFFFFF' }}>
              Click to browse or drag and drop files here
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
              Supported: JPEG, PNG, WebP, PDF, TXT (Max 5 MB each, up to {MAX_TOTAL_FILES - attachments.length} more)
            </div>
          </div>

          {/* Staged Files Preview */}
          {selectedFiles.length > 0 && (
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '0.5rem' }}>
                Files Selected for Upload ({selectedFiles.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 180, overflowY: 'auto' }}>
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                      <Paperclip size={14} style={{ color: '#4BA2FF', flexShrink: 0 }} />
                      <span style={{ color: '#FFFFFF', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </span>
                      <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>
                        ({formatBytes(file.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSelectedFile(idx);
                      }}
                      style={{ background: 'none', border: 'none', color: '#FF626C', cursor: 'pointer', padding: '0.2rem' }}
                      title="Remove file"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description input */}
          <div>
            <label className="form-label">Evidence Note / Description (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Screenshot taken when checkout failed"
              value={fileDescription}
              onChange={(e) => setFileDescription(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setUploadModalOpen(false);
                setSelectedFiles([]);
              }}
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading || selectedFiles.length === 0}
            >
              {uploading ? (
                <>
                  <LoadingSpinner size={14} /> Uploading...
                </>
              ) : (
                <>
                  <Upload size={14} /> Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Authenticated Preview Modal */}
      {previewModalOpen && (
        <Modal
          isOpen={previewModalOpen}
          onClose={closePreview}
          title={`Evidence Preview: ${previewData.name}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 250, justifyContent: 'center' }}>
            {loadingPreview ? (
              <div style={{ padding: '3rem 1rem', display: 'flex', justifyContent: 'center' }}>
                <LoadingSpinner message="Fetching encrypted evidence securely..." />
              </div>
            ) : previewData.mimeType?.startsWith('image/') && previewData.url ? (
              <div style={{ textAlign: 'center' }}>
                <img
                  src={previewData.url}
                  alt={previewData.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '65vh',
                    borderRadius: 'var(--radius-sm)',
                    objectFit: 'contain',
                    border: '1px solid var(--color-border-subtle)'
                  }}
                />
              </div>
            ) : previewData.mimeType === 'application/pdf' && previewData.url ? (
              <div style={{ height: '65vh' }}>
                <iframe
                  src={previewData.url}
                  title={previewData.name}
                  style={{ width: '100%', height: '100%', border: 'none', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
            ) : previewData.mimeType === 'text/plain' ? (
              <pre
                style={{
                  maxHeight: '60vh',
                  overflowY: 'auto',
                  backgroundColor: 'var(--color-surface-inset)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontFamily: 'monospace',
                  color: 'var(--color-text-secondary)',
                  whiteSpace: 'pre-wrap',
                  border: '1px solid var(--color-border-subtle)'
                }}
              >
                {previewData.textContent}
              </pre>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-secondary)' }}>
                Direct inline preview not available for this file type. Please use download.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EvidenceSection;
