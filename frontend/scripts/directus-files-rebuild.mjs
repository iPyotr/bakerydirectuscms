#!/usr/bin/env node
/**
 * Wipe all Directus files in our project folders, re-upload from public/ with
 * UNIQUE filename_download (so a category image and a slider image of the same
 * subject don't collide on filename), then re-link each item.
 *
 * Naming scheme:
 *   public/categories/<slug>.webp   → uploaded as category-<slug>.webp     [folder: Categories]
 *   public/sliders/<slug>.webp      → uploaded as slider-<slug>.webp       [folder: Sliders]
 *   public/sliders/<slug>.webp      → uploaded as hero-<slug>.webp         [folder: Hero slides]
 *   public/products/<slug>.webp     → uploaded as product-<slug>.webp      [folder: Products]
 *   public/ico/*                    → uploaded with original name          [folder: Logos]
 *
 * Idempotent. Run after editing master images or to clean up duplicates.
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
  readSingleton,
  uploadFiles,
  updateItem,
  updateSingleton,
} from "@directus/sdk";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");

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

// ----------- folders -----------
const folderDefs = [
  { name: "Logos", icon: "branding_watermark" },
  { name: "Categories", icon: "category" },
  { name: "Sliders", icon: "view_carousel" },
  { name: "Hero slides", icon: "slideshow" },
  { name: "Products", icon: "bakery_dining" },
];

async function ensureFolders() {
  const existing = await client.request(readFolders({ fields: ["id", "name"], limit: -1 }));
  const map = new Map(existing.map((f) => [f.name, f]));
  for (const def of folderDefs) {
    if (!map.has(def.name)) {
      const f = await client.request(createFolder(def));
      map.set(f.name, f);
      console.log(`[rebuild] + folder ${def.name}`);
      await sleep(120);
    }
  }
  return map;
}

// ----------- wipe -----------
async function wipeAllFiles() {
  console.log("[rebuild] reading existing files…");
  const files = await client.request(
    readFiles({ fields: ["id"], limit: -1 }),
  );
  if (!files.length) return;
  console.log(`[rebuild] deleting ${files.length} files…`);
  // 1) null out every reference first so Directus doesn't reject the delete.
  // (We re-link them later anyway.)
  for (const col of ["categories", "products", "hero_slides", "locations", "promotions"]) {
    try {
      const rows = await client.request(
        readItems(col, { fields: ["*"], limit: -1 }),
      );
      for (const row of rows) {
        const patch = {};
        for (const f of ["image", "slider_image", "og_image"]) {
          if (row[f]) patch[f] = null;
        }
        if (Object.keys(patch).length) {
          await client.request(updateItem(col, row.id, patch));
          await sleep(60);
        }
      }
    } catch {}
  }
  // 2) batch delete files
  const ids = files.map((f) => f.id);
  const CHUNK = 50;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const batch = ids.slice(i, i + CHUNK);
    await client.request(deleteFiles(batch));
    console.log(`[rebuild]   deleted ${i + 1}-${i + batch.length}`);
    await sleep(150);
  }
}

// ----------- upload -----------
async function uploadFile(localPath, downloadName, folderId, mime = "image/webp") {
  if (!existsSync(localPath)) {
    console.warn(`[rebuild]   ! ${localPath} not found`);
    return null;
  }
  const data = await readFile(localPath);
  const form = new FormData();
  form.append("title", basename(downloadName, ".webp").replace(/^[a-z]+-/, ""));
  form.append("filename_download", downloadName);
  if (folderId) form.append("folder", folderId);
  form.append("file", new Blob([data], { type: mime }), downloadName);
  const res = await client.request(uploadFiles(form));
  const id = Array.isArray(res) ? res[0]?.id : res.id;
  console.log(`[rebuild]   ↑ ${downloadName} → ${id}`);
  await sleep(60);
  return id;
}

// ----------- main -----------
async function main() {
  const folders = await ensureFolders();
  await wipeAllFiles();

  console.log("\n[rebuild] re-uploading & re-linking…\n");

  // Categories
  const categories = await client.request(
    readItems("categories", { fields: ["id", "slug"], limit: -1 }),
  );
  for (const c of categories) {
    const catImg = resolve(root, "public/categories", `${c.slug}.webp`);
    const sliderImg = resolve(root, "public/sliders", `${c.slug}.webp`);
    const imageId = await uploadFile(
      catImg,
      `category-${c.slug}.webp`,
      folders.get("Categories")?.id,
    );
    const sliderId = existsSync(sliderImg)
      ? await uploadFile(
          sliderImg,
          `slider-${c.slug}.webp`,
          folders.get("Sliders")?.id,
        )
      : null;
    await client.request(
      updateItem("categories", c.id, { image: imageId, slider_image: sliderId }),
    );
    console.log(`[rebuild]   ✓ category ${c.slug}`);
    await sleep(60);
  }

  // Products
  const products = await client.request(
    readItems("products", { fields: ["id", "slug"], limit: -1 }),
  );
  for (const p of products) {
    const productImg = resolve(root, "public/products", `${p.slug}.webp`);
    const imageId = await uploadFile(
      productImg,
      `product-${p.slug}.webp`,
      folders.get("Products")?.id,
    );
    if (imageId) {
      await client.request(updateItem("products", p.id, { image: imageId }));
      console.log(`[rebuild]   ✓ product ${p.slug}`);
    }
    await sleep(60);
  }

  // Hero slides — reuse slider images, but with unique hero-* filenames.
  const heroSlides = await client.request(
    readItems("hero_slides", { fields: ["id", "title", "cta_href"], limit: -1, sort: ["sort"] }),
  );
  // Map slide → which slider category to use.
  const heroSlugMap = {
    "/catalog": "bread",
    "/catalog/bread": "bread",
    "/catalog/savory-pastry": "savory-pastry",
    "/catalog/sweet-pastry": "sweet-pastry",
    "/catalog/frozen": "frozen",
    "/catalog/drinks": "drinks",
  };
  for (const s of heroSlides) {
    const slug = heroSlugMap[s.cta_href ?? ""] ?? "bread";
    const heroImg = resolve(root, "public/sliders", `${slug}.webp`);
    const imageId = await uploadFile(
      heroImg,
      `hero-${slug}.webp`,
      folders.get("Hero slides")?.id,
    );
    if (imageId) {
      await client.request(updateItem("hero_slides", s.id, { image: imageId }));
      console.log(`[rebuild]   ✓ hero ${s.title}`);
    }
    await sleep(60);
  }

  // Logos — keep original names
  const logos = [
    "public/ico/brand-mark.svg",
    "public/ico/logo.svg",
    "public/ico/logo-exact.svg",
    "public/ico/logo-preview.png",
  ];
  for (const lp of logos) {
    const fp = resolve(root, lp);
    if (existsSync(fp)) {
      const ext = lp.endsWith(".svg") ? "image/svg+xml" : "image/png";
      await uploadFile(fp, basename(fp), folders.get("Logos")?.id, ext);
    }
  }

  console.log("\n[rebuild] DONE ✨");
}

main().catch((err) => {
  console.error("[rebuild] ERROR:", err?.errors ?? err);
  process.exit(1);
});
