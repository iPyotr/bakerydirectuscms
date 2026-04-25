#!/usr/bin/env node
// Resize + convert all images in public/{products,categories,sliders}/ to WebP.
// Originals are moved to .image-backup/ (outside public, git-ignored).

import sharp from "sharp";
import { mkdir, readdir, rename, stat, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");
const publicDir = join(root, "public");
const backupDir = join(root, ".image-backup");

const targets = [
  {
    // Master size for products — Directus will downscale on the fly via
    // ?width=… so 1200 covers PDP (?width=1200) and card lists (?width=400).
    dir: "products",
    width: 1200,
    height: 1200,
    fit: "cover",
    position: "center",
    quality: 82,
  },
  {
    dir: "categories",
    width: 600,
    height: 600,
    fit: "cover",
    position: "center",
    quality: 85,
  },
  {
    dir: "sliders",
    width: 1920,
    height: 900,
    fit: "cover",
    position: "center",
    quality: 82,
  },
];

const fmt = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;

async function run() {
  let totalBefore = 0;
  let totalAfter = 0;
  let count = 0;

  for (const t of targets) {
    const srcDir = join(publicDir, t.dir);
    const bkpDir = join(backupDir, t.dir);
    if (!existsSync(srcDir)) {
      console.warn(`skip: ${srcDir} does not exist`);
      continue;
    }
    await mkdir(bkpDir, { recursive: true });

    // If sources already moved to backup (e.g. re-running with new sizes),
    // process directly from backup.
    const useBackup =
      (await readdir(srcDir)).filter((f) => /\.(png|jpe?g)$/i.test(f)).length === 0 &&
      existsSync(bkpDir);
    const files = (await readdir(useBackup ? bkpDir : srcDir)).filter((f) =>
      /\.(png|jpe?g)$/i.test(f),
    );

    console.log(`\n[${t.dir}] ${t.width}×${t.height} webp q${t.quality}`);
    for (const file of files) {
      const name = basename(file, extname(file));
      const src = join(srcDir, file);
      const bkp = join(bkpDir, file);
      const dst = join(srcDir, `${name}.webp`);

      // Move original to backup (or keep if already moved earlier).
      if (!existsSync(bkp)) {
        await rename(src, bkp);
      } else if (existsSync(src) && !useBackup) {
        await rm(src);
      }
      // Also remove pre-existing webp output (about to be regenerated).
      if (existsSync(dst)) await rm(dst);

      const before = (await stat(bkp)).size;
      await sharp(bkp)
        .resize(t.width, t.height, { fit: t.fit, position: t.position })
        .webp({ quality: t.quality, effort: 5 })
        .toFile(dst);
      const after = (await stat(dst)).size;

      totalBefore += before;
      totalAfter += after;
      count++;

      const saved = (1 - after / before) * 100;
      console.log(
        `  ${name.padEnd(22)} ${fmt(before).padStart(8)} → ${fmt(after).padStart(8)}  (-${saved.toFixed(0)}%)`,
      );
    }
  }

  console.log(`\nTOTAL: ${count} images`);
  console.log(
    `       ${fmt(totalBefore)} → ${fmt(totalAfter)}  (${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1)}% reduction)`,
  );
  console.log(`\nOriginals saved in: .image-backup/`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
