const path = require('path');
const crypto = require('crypto');

const MAX_FILE_SIZE = parseInt(process.env.MAX_ATTACHMENT_SIZE || '5242880', 10); // 5 MB
const MAX_ATTACHMENTS_PER_COMPLAINT = 5;

const ALLOWED_MIME_TYPES = {
  'image/jpeg': {
    extensions: ['.jpg', '.jpeg'],
    category: 'image',
    checkMagic: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  },
  'image/png': {
    extensions: ['.png'],
    category: 'image',
    checkMagic: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a
  },
  'image/webp': {
    extensions: ['.webp'],
    category: 'image',
    checkMagic: (buf) =>
      buf.length >= 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
  },
  'application/pdf': {
    extensions: ['.pdf'],
    category: 'document',
    checkMagic: (buf) => buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-'
  },
  'text/plain': {
    extensions: ['.txt', '.log'],
    category: 'text',
    checkMagic: (buf) => {
      // Must not contain null bytes or control codes (except \t, \n, \r)
      const maxCheck = Math.min(buf.length, 1024);
      for (let i = 0; i < maxCheck; i++) {
        const byte = buf[i];
        if (byte === 0x00) return false; // null byte = binary
        if (byte < 0x09 || (byte > 0x0d && byte < 0x20 && byte !== 0x1b)) {
          return false;
        }
      }
      return true;
    }
  }
};

/**
 * Sanitize original display filename to remove traversal sequences, null bytes, and illegal characters
 * @param {string} rawName
 * @returns {string}
 */
const sanitizeFilename = (rawName = '') => {
  if (typeof rawName !== 'string') return 'attachment';
  // Strip path traversal and null bytes
  let base = path.basename(rawName).replace(/\0/g, '').trim();
  // Strip dangerous characters
  base = base.replace(/[^a-zA-Z0-9._\- ]/g, '_');
  // Truncate to safe length while preserving extension
  const ext = path.extname(base);
  const nameWithoutExt = path.basename(base, ext);
  const truncatedName = nameWithoutExt.slice(0, 80) || 'attachment';
  return `${truncatedName}${ext.toLowerCase()}`;
};

/**
 * Validate uploaded file buffer against size, extensions, declared MIME type, and magic numbers
 * @param {object} file - Multer file object with buffer, originalname, mimetype, size
 * @returns {{ valid: boolean, error?: string, verifiedMime?: string, checksum?: string, safeName?: string }}
 */
const validateFileBuffer = (file) => {
  if (!file || !file.buffer || !Buffer.isBuffer(file.buffer)) {
    return { valid: false, error: 'No file buffer provided for verification.' };
  }

  // 1) File Size Constraints
  if (file.buffer.length === 0) {
    return { valid: false, error: 'File is empty (zero-byte payload).' };
  }

  if (file.buffer.length > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds the allowed limit of ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB.`
    };
  }

  // 2) Extension Check
  const safeName = sanitizeFilename(file.originalname);
  const ext = path.extname(safeName).toLowerCase();

  let matchedConfig = null;
  let verifiedMime = null;

  for (const [mime, config] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (config.extensions.includes(ext)) {
      matchedConfig = config;
      verifiedMime = mime;
      break;
    }
  }

  if (!matchedConfig) {
    const supported = Object.values(ALLOWED_MIME_TYPES)
      .flatMap((c) => c.extensions)
      .join(', ');
    return {
      valid: false,
      error: `Unsupported file extension (${ext || 'none'}). Permitted extensions: ${supported}.`
    };
  }

  // 3) Magic Number / Binary Signature Verification
  const isSignatureValid = matchedConfig.checkMagic(file.buffer);
  if (!isSignatureValid) {
    return {
      valid: false,
      error: `File signature mismatch: File content does not match the declared extension (${ext}).`
    };
  }

  // 4) Compute SHA-256 Integrity Checksum
  const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

  return {
    valid: true,
    verifiedMime,
    checksum,
    safeName,
    size: file.buffer.length
  };
};

module.exports = {
  MAX_FILE_SIZE,
  MAX_ATTACHMENTS_PER_COMPLAINT,
  ALLOWED_MIME_TYPES,
  sanitizeFilename,
  validateFileBuffer
};
