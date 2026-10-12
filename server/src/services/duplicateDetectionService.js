/**
 * Duplicate Complaint Detection Service for ResolveX
 *
 * Implements deterministic text normalization, domain stemmer/synonym reduction,
 * TF-IDF vectorization, cosine similarity, Dice token overlap, and contextual
 * multi-signal scoring (category compatibility, recency lookback, and term overlap).
 */

// Documented list of common generic English stop words.
// Domain-specific identifiers, transaction references, error codes, and numbers are strictly preserved.
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but',
  'by', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
  'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me',
  'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only',
  'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
  'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
  'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
  'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
  'will', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
  // Conversational pleasantries and filler tokens
  'please', 'help', 'thank', 'thanks', 'hello', 'hi', 'dear', 'sir', 'madam'
]);

// Deterministic domain synonyms for customer complaint vocabulary
const DOMAIN_SYNONYMS = {
  deducted: 'debit',
  deduct: 'debit',
  debited: 'debit',
  deduction: 'debit',
  charged: 'debit',
  charging: 'debit',
  charges: 'debit',
  failed: 'fail',
  failure: 'fail',
  failing: 'fail',
  cancelled: 'cancel',
  cancellation: 'cancel',
  canceling: 'cancel',
  confirmed: 'confirm',
  confirmation: 'confirm',
  confirming: 'confirm',
  damaged: 'damag',
  damaging: 'damag',
  delayed: 'delay',
  delaying: 'delay',
  delays: 'delay',
  received: 'receiv',
  receiving: 'receiv',
  refunded: 'refund',
  refunding: 'refund',
  refunds: 'refund',
  disconnected: 'disconnect',
  disconnecting: 'disconnect',
  connected: 'connect',
  connecting: 'connect',
  connection: 'connect',
  delivered: 'deliver',
  delivering: 'deliver',
  delivery: 'deliver'
};

// Configurable default thresholds
const DEFAULT_CONFIG = {
  candidateLookbackDays: 30,
  maxCandidates: 100,
  minSimilarityThreshold: 0.55,
  maxDisplayedSuggestions: 5,
  titleWeight: 0.55,
  descriptionWeight: 0.45,
  mismatchedCategoryPenalty: 0.6,
  recencyBoostDays: 7,
  recencyBoostValue: 0.05
};

/**
 * Lightweight deterministic stemmer for complaint terminology.
 *
 * @param {string} token
 * @returns {string} Stemmed or normalized token
 */
function stemToken(token) {
  if (DOMAIN_SYNONYMS[token]) {
    return DOMAIN_SYNONYMS[token];
  }
  if (token.length > 5) {
    if (token.endsWith('tion')) return token.slice(0, -4);
    if (token.endsWith('ing')) return token.slice(0, -3);
    if (token.endsWith('ed')) return token.slice(0, -2);
    if (token.endsWith('es')) return token.slice(0, -2);
    if (token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  }
  return token;
}

/**
 * Normalize and tokenize raw text.
 * - Converts to lowercase.
 * - Preserves alphanumeric characters, hyphens, and underscores for ticket/order/error IDs (e.g. RX-2026, 404, ERR_500).
 * - Strips punctuation and excessive whitespace.
 * - Removes stop words unless the token is a meaningful number or identifier.
 * - Applies lightweight stemming and domain synonym canonicalization.
 *
 * @param {string} text - Raw input text
 * @returns {string[]} Array of normalized tokens
 */
function normalizeAndTokenize(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Lowercase and replace non-alphanumeric (except hyphens and underscores) with spaces
  const cleaned = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];

  const rawTokens = cleaned.split(' ');
  const tokens = [];

  for (const token of rawTokens) {
    const trimmed = token.replace(/^[-_]+|[-_]+$/g, '');
    if (!trimmed || trimmed.length < 2) continue;

    // Keep token if it's not a stop word, or if it contains digits/hyphens (identifiers)
    if (!STOP_WORDS.has(trimmed) || /\d/.test(trimmed) || trimmed.includes('-')) {
      tokens.push(stemToken(trimmed));
    }
  }

  return tokens;
}

/**
 * Compute Term Frequency (TF) for a token list.
 * TF(t) = count(t) / total_tokens
 *
 * @param {string[]} tokens
 * @returns {Map<string, number>} Map of token -> term frequency
 */
function computeTF(tokens) {
  const tf = new Map();
  if (!tokens || tokens.length === 0) return tf;

  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }

  const total = tokens.length;
  for (const [token, count] of tf.entries()) {
    tf.set(token, count / total);
  }

  return tf;
}

/**
 * Calculate Cosine Similarity between two TF vectors using a shared IDF map.
 *
 * @param {Map<string, number>} tf1
 * @param {Map<string, number>} tf2
 * @param {Map<string, number>} idf
 * @returns {number} Cosine similarity in range [0, 1]
 */
function calculateCosineSimilarity(tf1, tf2, idf) {
  if (tf1.size === 0 || tf2.size === 0) return 0;

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (const [term, freq1] of tf1.entries()) {
    const termIdf = idf ? (idf.get(term) || 1.0) : 1.0;
    const w1 = freq1 * termIdf;
    norm1 += w1 * w1;

    if (tf2.has(term)) {
      const freq2 = tf2.get(term);
      const w2 = freq2 * termIdf;
      dotProduct += w1 * w2;
    }
  }

  for (const [term, freq2] of tf2.entries()) {
    const termIdf = idf ? (idf.get(term) || 1.0) : 1.0;
    const w2 = freq2 * termIdf;
    norm2 += w2 * w2;
  }

  if (norm1 === 0 || norm2 === 0) return 0;

  const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  return Math.min(1.0, Math.max(0.0, similarity));
}

/**
 * Calculate Dice Token Overlap coefficient.
 * Overlap = (2 * |A ∩ B|) / (|A| + |B|)
 *
 * @param {string[]} tokens1
 * @param {string[]} tokens2
 * @returns {number} Overlap in range [0, 1]
 */
function calculateTokenOverlap(tokens1, tokens2) {
  if (!tokens1 || !tokens2 || tokens1.length === 0 || tokens2.length === 0) return 0;
  const s1 = new Set(tokens1);
  const s2 = new Set(tokens2);
  let common = 0;
  for (const t of s1) {
    if (s2.has(t)) common++;
  }
  return (2 * common) / (s1.size + s2.size);
}

/**
 * Build global Inverse Document Frequency (IDF) map for a corpus.
 * IDF(t) = log((N + 1) / (DF(t) + 1)) + 1
 *
 * @param {Array<string[]>} documents - List of token arrays
 * @returns {Map<string, number>} Map of token -> IDF weight
 */
function buildIDF(documents) {
  const idf = new Map();
  const N = documents.length;
  if (N === 0) return idf;

  const docFreq = new Map();
  for (const tokens of documents) {
    const uniqueTokens = new Set(tokens);
    for (const token of uniqueTokens) {
      docFreq.set(token, (docFreq.get(token) || 0) + 1);
    }
  }

  for (const [token, df] of docFreq.entries()) {
    idf.set(token, Math.log((N + 1) / (df + 1)) + 1.0);
  }

  return idf;
}

/**
 * Find overlapping significant keywords between two token lists.
 *
 * @param {string[]} tokens1
 * @param {string[]} tokens2
 * @returns {string[]} Shared unique keywords
 */
function getMatchingTerms(tokens1, tokens2) {
  const set2 = new Set(tokens2);
  const matched = new Set();
  for (const t of tokens1) {
    if (set2.has(t)) {
      matched.add(t);
    }
  }
  return Array.from(matched).slice(0, 8);
}

/**
 * Compute composite similarity between target query complaint and an existing candidate.
 *
 * @param {Object} query - { title, description, category }
 * @param {Object} candidate - Existing complaint record
 * @param {Map<string, number>} titleIdf - Shared IDF map for titles
 * @param {Map<string, number>} descIdf - Shared IDF map for descriptions
 * @param {Object} config - Configuration parameters
 * @returns {Object} { score, titleScore, descScore, matchedTerms, reasons }
 */
function evaluateComplaintSimilarity(query, candidate, titleIdf, descIdf, config = DEFAULT_CONFIG) {
  const qTitleTokens = normalizeAndTokenize(query.title);
  const qDescTokens = normalizeAndTokenize(query.description);

  const cTitleTokens = normalizeAndTokenize(candidate.title);
  const cDescTokens = normalizeAndTokenize(candidate.description);

  // Title similarity: combination of Cosine and Dice overlap
  const qTitleTF = computeTF(qTitleTokens);
  const cTitleTF = computeTF(cTitleTokens);
  const titleCosine = calculateCosineSimilarity(qTitleTF, cTitleTF, titleIdf);
  const titleOverlap = calculateTokenOverlap(qTitleTokens, cTitleTokens);
  const titleScore = Math.max(titleCosine, (titleCosine + titleOverlap) / 2);

  // Description similarity: combination of Cosine and Dice overlap
  const qDescTF = computeTF(qDescTokens);
  const cDescTF = computeTF(cDescTokens);
  const descCosine = calculateCosineSimilarity(qDescTF, cDescTF, descIdf);
  const descOverlap = calculateTokenOverlap(qDescTokens, cDescTokens);
  const descScore = Math.max(descCosine, (descCosine + descOverlap) / 2);

  // Weighted textual score
  let textScore = (titleScore * config.titleWeight) + (descScore * config.descriptionWeight);

  // If title has extremely high match (>0.80), prioritize it
  if (titleScore > 0.80) {
    textScore = Math.max(textScore, titleScore * 0.9);
  }

  // Category Compatibility Signal
  const categoryMatch = query.category && candidate.category && query.category === candidate.category;
  const categoryMultiplier = categoryMatch ? 1.0 : config.mismatchedCategoryPenalty;

  let finalScore = textScore * categoryMultiplier;

  // Recency bonus: Recent issues within 7 days get slight boost
  const candidateAgeDays = candidate.createdAt
    ? (Date.now() - new Date(candidate.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    : 30;

  if (candidateAgeDays <= config.recencyBoostDays && finalScore >= config.minSimilarityThreshold * 0.85) {
    finalScore += config.recencyBoostValue;
  }

  finalScore = Math.round(Math.min(1.0, Math.max(0.0, finalScore)) * 100) / 100;

  // Match signals and human-readable explanation
  const matchedTerms = getMatchingTerms(
    [...qTitleTokens, ...qDescTokens],
    [...cTitleTokens, ...cDescTokens]
  );

  const reasons = [];
  if (categoryMatch) {
    reasons.push(`Matching category: ${query.category}`);
  } else if (query.category && candidate.category) {
    reasons.push(`Different category (${query.category} vs ${candidate.category})`);
  }

  if (titleScore >= 0.6) {
    reasons.push(`High title similarity (${Math.round(titleScore * 100)}%)`);
  } else if (titleScore >= 0.4) {
    reasons.push(`Moderate title similarity (${Math.round(titleScore * 100)}%)`);
  }

  if (descScore >= 0.6) {
    reasons.push(`High description similarity (${Math.round(descScore * 100)}%)`);
  } else if (descScore >= 0.4) {
    reasons.push(`Moderate description similarity (${Math.round(descScore * 100)}%)`);
  }

  if (matchedTerms.length > 0) {
    reasons.push(`Shared terms: ${matchedTerms.slice(0, 5).join(', ')}`);
  }

  if (candidateAgeDays <= config.recencyBoostDays) {
    reasons.push('Filed recently (within 7 days)');
  }

  return {
    score: finalScore,
    titleScore: Math.round(titleScore * 100) / 100,
    descScore: Math.round(descScore * 100) / 100,
    categoryMatch,
    matchedTerms,
    reasons
  };
}

/**
 * Scan candidate complaints and identify potential duplicates.
 *
 * @param {Object} query - { title, description, category }
 * @param {Array<Object>} candidates - List of candidate complaint records
 * @param {Object} customConfig - Optional threshold overrides
 * @returns {Array<Object>} Ranked duplicate suggestions
 */
function findDuplicates(query, candidates, customConfig = {}) {
  const config = { ...DEFAULT_CONFIG, ...customConfig };

  if (!query || !query.title || !candidates || candidates.length === 0) {
    return [];
  }

  // Build IDF maps across the query + candidate corpus
  const allTitleTokens = [normalizeAndTokenize(query.title)];
  const allDescTokens = [normalizeAndTokenize(query.description || '')];

  for (const c of candidates) {
    allTitleTokens.push(normalizeAndTokenize(c.title));
    allDescTokens.push(normalizeAndTokenize(c.description || ''));
  }

  const titleIdf = buildIDF(allTitleTokens);
  const descIdf = buildIDF(allDescTokens);

  const scoredCandidates = [];

  for (const candidate of candidates) {
    const evaluation = evaluateComplaintSimilarity(query, candidate, titleIdf, descIdf, config);

    if (evaluation.score >= config.minSimilarityThreshold) {
      scoredCandidates.push({
        complaint: candidate,
        score: evaluation.score,
        titleScore: evaluation.titleScore,
        descScore: evaluation.descScore,
        categoryMatch: evaluation.categoryMatch,
        matchedTerms: evaluation.matchedTerms,
        reasons: evaluation.reasons
      });
    }
  }

  // Sort by score descending, then by creation date descending
  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const dateA = a.complaint.createdAt ? new Date(a.complaint.createdAt).getTime() : 0;
    const dateB = b.complaint.createdAt ? new Date(b.complaint.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  return scoredCandidates.slice(0, config.maxDisplayedSuggestions);
}

module.exports = {
  STOP_WORDS,
  DEFAULT_CONFIG,
  normalizeAndTokenize,
  computeTF,
  buildIDF,
  calculateCosineSimilarity,
  calculateTokenOverlap,
  evaluateComplaintSimilarity,
  findDuplicates
};
