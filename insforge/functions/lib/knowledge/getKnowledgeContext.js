/**
 * Eva WA — local CAG knowledge context (8B.1 scaffold, 8B.3 router alignment).
 * RAG mode is intentionally disabled in 8B.3.
 */

const fs = require("fs");
const path = require("path");
const { normalizeCagQuery, classifyCagQuery } = require("./cagQueryNormalizer");

const ROOT = path.resolve(__dirname, "../../../..");
const DEFAULT_CACHE_PATH = path.join(ROOT, "docs/knowledge/cache/eva-cache-v1.json");

let _cache = null;
let _cachePath = null;

function loadCache(cachePath = DEFAULT_CACHE_PATH) {
  if (_cache && _cachePath === cachePath) return _cache;
  if (!fs.existsSync(cachePath)) {
    _cache = null;
    _cachePath = cachePath;
    return null;
  }
  _cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
  _cachePath = cachePath;
  return _cache;
}

function isQuerySuitableForCAG(query) {
  return classifyCagQuery(query).suitable;
}

function getKnowledgeContext(query, options = {}) {
  const cachePath = options.cachePath || DEFAULT_CACHE_PATH;
  const classification = classifyCagQuery(query);
  const normalizedQuery = classification.normalizedQuery || normalizeCagQuery(query);
  const cache = loadCache(cachePath);

  if (!cache || !cache.context) {
    return {
      mode: "NONE",
      source: "missing_cache",
      context: "",
      confidence: "none",
      category: "missing_cache",
      normalizedQuery,
      reason: "cache_file_not_found",
      knowledgeVersion: null,
    };
  }

  if (!classification.suitable) {
    return {
      mode: "NONE",
      source: "not_cag_suitable",
      context: "",
      confidence: "none",
      category: classification.category,
      normalizedQuery,
      reason: classification.reason,
      knowledgeVersion: cache.knowledgeVersion,
    };
  }

  return {
    mode: "CAG",
    source: "cache",
    knowledgeVersion: cache.knowledgeVersion,
    context: cache.context,
    confidence: "static",
    category: classification.category,
    normalizedQuery,
    reason: classification.reason,
    contentHash: cache.contentHash,
    tokenEstimate: cache.tokenEstimate,
  };
}

/** @deprecated use normalizeCagQuery from cagQueryNormalizer */
function normalizeQuery(input) {
  return normalizeCagQuery(input);
}

module.exports = {
  getKnowledgeContext,
  isQuerySuitableForCAG,
  normalizeQuery,
  classifyCagQuery,
};
