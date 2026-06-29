#!/usr/bin/env node
/**
 * Build Eva WA Unilatino CAG cache from static knowledge pack.
 * Usage: node scripts/build-eva-cag-cache.mjs
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const METADATA_PATH = path.join(ROOT, "docs/knowledge/metadata.json");
const STATIC_DIR = path.join(ROOT, "docs/knowledge/static");
const OUT_PATH = path.join(ROOT, "docs/knowledge/cache/eva-cache-v1.json");

const SEP = "\n\n---\n\n";

function readMetadata() {
  return JSON.parse(fs.readFileSync(METADATA_PATH, "utf8"));
}

function buildContext(metadata) {
  const parts = [];
  const sourceFiles = [];

  for (const doc of metadata.staticDocuments) {
    const abs = path.join(ROOT, doc.path);
    if (!fs.existsSync(abs)) {
      throw new Error(`Missing static document: ${doc.path}`);
    }
    const body = fs.readFileSync(abs, "utf8");
    parts.push(`# [${doc.id}] ${doc.category}\n\n${body.trim()}`);
    sourceFiles.push({
      id: doc.id,
      path: doc.path,
      category: doc.category,
    });
  }

  const context = parts.join(SEP);
  return { context, sourceFiles };
}

function main() {
  const metadata = readMetadata();
  const { context, sourceFiles } = buildContext(metadata);
  const contentHash = crypto.createHash("sha256").update(context, "utf8").digest("hex");
  const generatedAt = new Date().toISOString();
  const tokenEstimate = Math.ceil(context.length / 4);

  const cache = {
    tenantId: metadata.tenantId,
    verticalId: metadata.verticalId,
    knowledgeVersion: metadata.knowledgeVersion,
    generatedAt,
    contentHash,
    tokenEstimate,
    sourceFiles,
    context,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(cache, null, 2), "utf8");

  console.log(`CAG cache OK: ${OUT_PATH}`);
  console.log(`  version: ${cache.knowledgeVersion}`);
  console.log(`  hash: ${contentHash.slice(0, 16)}…`);
  console.log(`  tokenEstimate: ${tokenEstimate}`);
  console.log(`  sourceFiles: ${sourceFiles.length}`);
}

main();
