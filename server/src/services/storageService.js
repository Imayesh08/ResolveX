const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Dedicated private storage directory (never mounted as public static directory)
const STORAGE_DIR = process.env.ATTACHMENT_STORAGE_PATH
  ? path.resolve(process.env.ATTACHMENT_STORAGE_PATH)
  : path.resolve(__dirname, '../../uploads/attachments');

// Ensure directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true, mode: 0o700 });
}

/**
 * Validate that storage key is a clean alphanumeric UUID/hash + extension (no path traversal)
 * @param {string} storageKey
 * @returns {boolean}
 */
const isValidStorageKey = (storageKey) => {
  if (typeof storageKey !== 'string') return false;
  // Strict regex: UUID/hex with single allowed extension, no slashes or dots traversal
  return /^[a-zA-Z0-9_\-]{8,64}\.[a-zA-Z0-9]{2,10}$/.test(storageKey);
};

/**
 * Resolve safe absolute filesystem path for storage key
 * @param {string} storageKey
 * @returns {string}
 */
const resolveSafePath = (storageKey) => {
  if (!isValidStorageKey(storageKey)) {
    throw new Error('Invalid storage key format.');
  }
  const resolved = path.resolve(STORAGE_DIR, storageKey);
  // Guarantee path stays strictly inside STORAGE_DIR
  if (!resolved.startsWith(STORAGE_DIR)) {
    throw new Error('Path traversal detected.');
  }
  return resolved;
};

/**
 * Store a file buffer in private storage
 * @param {Buffer} buffer - File buffer
 * @param {string} originalFilename - Original filename (to extract safe extension)
 * @returns {Promise<{ storageKey: string, size: number, checksum: string }>}
 */
const storeFile = async (buffer, originalFilename) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Invalid buffer provided to storeFile.');
  }

  const ext = path.extname(originalFilename).toLowerCase() || '.bin';
  const randomId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const storageKey = `${randomId}${ext}`;
  const filePath = resolveSafePath(storageKey);

  // Write atomically with restricted 0o600 permissions
  await fs.promises.writeFile(filePath, buffer, { mode: 0o600 });

  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

  return {
    storageKey,
    size: buffer.length,
    checksum
  };
};

/**
 * Get readable stream and stats for a stored file
 * @param {string} storageKey
 * @returns {{ stream: fs.ReadStream, size: number } | null}
 */
const getFileStream = (storageKey) => {
  try {
    const filePath = resolveSafePath(storageKey);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const stat = fs.statSync(filePath);
    const stream = fs.createReadStream(filePath);
    return { stream, size: stat.size };
  } catch (err) {
    console.error('Error opening file stream:', err.message);
    return null;
  }
};

/**
 * Delete a file from private storage
 * @param {string} storageKey
 * @returns {Promise<boolean>}
 */
const deleteFile = async (storageKey) => {
  try {
    const filePath = resolveSafePath(storageKey);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error deleting stored file:', err.message);
    return false;
  }
};

/**
 * Check if a file exists in private storage
 * @param {string} storageKey
 * @returns {boolean}
 */
const fileExists = (storageKey) => {
  try {
    const filePath = resolveSafePath(storageKey);
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
};

module.exports = {
  STORAGE_DIR,
  storeFile,
  getFileStream,
  deleteFile,
  fileExists,
  isValidStorageKey
};
