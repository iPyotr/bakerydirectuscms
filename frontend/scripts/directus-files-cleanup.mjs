#!/usr/bin/env node
/**
 * Audit + cleanup of Directus files:
 *   1. Group files by filename_download → pick the canonical id (first by created_on)
 *   2. Re-point every reference (categories/products/hero_slides/locations.image
 *      and slider_image / og_image) from duplicates → canonical
 *   3. Delete duplicates and any orphan files (referenced nowhere)
 *   4. Create folders Categories/Sliders/Products/Hero slides/Logos and move
 *      each canonical file into the right folder
 *
 * Idempotent.  Usage:
 *   DIRECTUS_URL=… DIRECTUS_ADMIN_TOKEN=… node scripts/directus-files-cleanup.mjs
 */
import {
  createDirectus,
  rest,
  staticToken,
  createFolder,
  deleteFiles,
  readFiles,
  readFolders,
  readItems,
  updateFile,
  updateFiles,
  updateItem,
} from "@directus/sdk";

const DIRECTUS_URL = process.env.DIRECTUS_URL;
const ADMIN_TOKEN =
  process.env.DIRECTUS_ADMIN_TOKEN ||
  process.env.ADMIN_TOKEN ||
  process.env.direstus_admin_token;

if (!DIRECTUS_URL || !ADMIN_TOKEN) {
  console.error("Missing DIRECTUS_URL / DIRECTUS_ADMIN_TOKEN");
  process.exit(1);
}

const client = createDirectus(DIRECTUS_URL).with(staticToken(ADMIN_TOKEN)).with(rest());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 1. fetch all files & build duplicate map ----------
console.log("[cleanup] reading files…");
const files = await client.request(
  readFiles({
    fields: ["id", "filename_download", "title", "type", "filesize", "created_on", "folder"],
    limit: -1,
  }),
);
console.log(`[cleanup] total files: ${files.length}`);

// Group by filename_download (drop random suffix Directus may add).
const groups = new Map();
for (const f of files) {
  const key = f.filename_download;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(f);
}

// Pick canonical = oldest by created_on.
const canonicalById = new Map(); // id -> canonical id (could be self)
const duplicateIds = new Set();
let dupGroups = 0;
for (const [name, list] of groups) {
  list.sort((a, b) => new Date(a.created_on) - new Date(b.created_on));
  const canonical = list[0];
  for (const f of list) canonicalById.set(f.id, canonical.id);
  if (list.length > 1) {
    dupGroups++;
    for (const f of list.slice(1)) duplicateIds.add(f.id);
  }
}
console.log(
  `[cleanup] duplicate groups: ${dupGroups}  duplicates to remove: ${duplicateIds.size}`,
);

// ---------- 2. find references in collections ----------
const collectionsToScan = [
  { collection: "categories", fields: ["image", "slider_image", "og_image"] },
  { collection: "products", fields: ["image", "og_image"] },
  { collection: "hero_slides", fields: ["image"] },
  { collection: "locations", fields: ["image"] },
  { collection: "promotions", fields: ["image"] },
];

const usedFileIds = new Set();
async function scanCollection(col, fieldList) {
  const rows = await client.request(
    readItems(col, { fields: ["id", ...fieldList], limit: -1 }),
  );
  for (const row of rows) {
    for (const field of fieldList) {
      const val = row[field];
      if (typeof val !== "string") continue;
      const canonical = canonicalById.get(val);
      if (canonical && canonical !== val) {
        // re-point to canonical id
        await client.request(updateItem(col, row.id, { [field]: canonical }));
        console.log(`[cleanup]   ${col}#${row.id}.${field}: ${val} → ${canonical}`);
        await sleep(100);
        usedFileIds.add(canonical);
      } else if (canonical) {
        usedFileIds.add(canonical);
      }
    }
  }
}
for (const c of collectionsToScan) {
  console.log(`[cleanup] scanning ${c.collection}…`);
  await scanCollection(c.collection, c.fields);
}

// Also probe globals singleton
try {
  const globals = await client.request(
    readItems("globals", { fields: ["*"], limit: 1 }),
  );
  // singleton may have logo / og_image fields if added later — nothing to do today
  void globals;
} catch {}

// ---------- 3. delete duplicates (after re-point) and orphans ----------
const usedAlsoIncludingDuplicates = new Set([...usedFileIds]);

// Anything not used and not the canonical of a used file is an orphan.
const orphanIds = files
  .map((f) => f.id)
  .filter((id) => {
    const canonical = canonicalById.get(id) ?? id;
    return !usedAlsoIncludingDuplicates.has(canonical);
  });

const toDeleteSet = new Set(duplicateIds);
for (const id of orphanIds) toDeleteSet.add(id);
// Never delete a canonical that is in use
for (const id of usedFileIds) toDeleteSet.delete(id);

const toDelete = [...toDeleteSet];
console.log(
  `[cleanup] used canonicals: ${usedFileIds.size}  to delete (dupes + orphans): ${toDelete.length}`,
);

if (toDelete.length) {
  const CHUNK = 50;
  for (let i = 0; i < toDelete.length; i += CHUNK) {
    const batch = toDelete.slice(i, i + CHUNK);
    await client.request(deleteFiles(batch));
    console.log(`[cleanup]   deleted batch ${i + 1}-${i + batch.length}`);
    await sleep(150);
  }
}

// ---------- 4. folders ----------
console.log("[cleanup] ensuring folders…");
const folderDefs = [
  { name: "Logos", icon: "branding_watermark" },
  { name: "Categories", icon: "category" },
  { name: "Hero slides", icon: "slideshow" },
  { name: "Sliders", icon: "view_carousel" },
  { name: "Products", icon: "bakery_dining" },
];
const existingFolders = await client.request(
  readFolders({ fields: ["id", "name"], limit: -1 }),
);
const folderByName = new Map(existingFolders.map((f) => [f.name, f]));
for (const def of folderDefs) {
  if (!folderByName.has(def.name)) {
    const f = await client.request(createFolder(def));
    folderByName.set(f.name, f);
    console.log(`[cleanup]   + folder ${def.name}`);
    await sleep(120);
  }
}

// Move each used canonical file into appropriate folder by filename pattern.
const moves = [];
for (const id of usedFileIds) {
  const file = files.find((f) => f.id === id);
  if (!file) continue;
  let folderName = null;
  const fn = file.filename_download.toLowerCase();
  if (fn.includes("logo") || fn === "brand-mark.svg") folderName = "Logos";
  // Per-collection match by reverse lookup: cheapest is via filename namespace if seed used it
  if (!folderName) {
    if (await fileBelongsToCollection(id, "hero_slides")) folderName = "Hero slides";
    else if (await fileBelongsToCollection(id, "categories", "slider_image"))
      folderName = "Sliders";
    else if (await fileBelongsToCollection(id, "categories")) folderName = "Categories";
    else if (await fileBelongsToCollection(id, "products")) folderName = "Products";
  }
  if (folderName) {
    const target = folderByName.get(folderName);
    if (target && file.folder !== target.id) {
      moves.push({ id, folder: target.id, name: folderName });
    }
  }
}

async function fileBelongsToCollection(fileId, collection, field = "image") {
  const rows = await client.request(
    readItems(collection, { fields: ["id"], filter: { [field]: { _eq: fileId } }, limit: 1 }),
  );
  return rows.length > 0;
}

console.log(`[cleanup] moving ${moves.length} files into folders…`);
for (const m of moves) {
  await client.request(updateFile(m.id, { folder: m.folder }));
  console.log(`[cleanup]   ${m.id} → ${m.name}`);
  await sleep(80);
}

console.log("\n[cleanup] DONE ✨");
