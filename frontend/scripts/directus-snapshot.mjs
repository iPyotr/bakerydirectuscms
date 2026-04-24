#!/usr/bin/env node
/**
 * Dump Directus schema (collections, fields, relations) to
 * deploy/directus-snapshot.json so it can be reviewed in PRs.
 *
 * Apply a snapshot back with the CLI:
 *   npx directus schema apply deploy/directus-snapshot.json
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const outPath = resolve(repoRoot, "deploy/directus-snapshot.json");

const DIRECTUS_URL = process.env.DIRECTUS_URL;
const TOKEN =
  process.env.DIRECTUS_ADMIN_TOKEN ||
  process.env.ADMIN_TOKEN ||
  process.env.direstus_admin_token;

if (!DIRECTUS_URL || !TOKEN) {
  console.error("Missing DIRECTUS_URL / DIRECTUS_ADMIN_TOKEN");
  process.exit(1);
}

const res = await fetch(`${DIRECTUS_URL}/schema/snapshot`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
if (!res.ok) {
  console.error(`HTTP ${res.status}`, await res.text());
  process.exit(1);
}
const { data } = await res.json();
writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log(`✓ wrote ${outPath}`);
