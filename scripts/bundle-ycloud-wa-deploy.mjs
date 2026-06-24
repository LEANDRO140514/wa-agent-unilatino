#!/usr/bin/env node
/**
 * Bundle ycloud-wa-inbound + academic-engine + eva-llm for InsForge deploy.
 * Output: insforge/functions/dist/ycloud-wa-inbound.deploy.js
 *
 * Usage: node scripts/bundle-ycloud-wa-deploy.mjs
 */

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const entry = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
const outfile = path.join(ROOT, "insforge/functions/dist/ycloud-wa-inbound.deploy.js");

fs.mkdirSync(path.dirname(outfile), { recursive: true });

execFileSync(
  "npx",
  [
    "esbuild",
    entry,
    "--bundle",
    "--platform=neutral",
    "--format=cjs",
    `--outfile=${outfile}`,
    "--external:npm:@insforge/sdk",
  ],
  { stdio: "inherit", cwd: ROOT, shell: true },
);

const stat = fs.statSync(outfile);
console.log(`Bundle OK: ${outfile} (${(stat.size / 1024).toFixed(1)} KB)`);
