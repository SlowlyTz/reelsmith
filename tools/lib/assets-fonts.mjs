// Fonts: OFL TTFs from a pinned google/fonts commit -> assets/fonts/<file>, copied unchanged.
// Recipe: assets/manifests/fonts.json.
import fs from 'node:fs';
import path from 'node:path';

const cached = (f, cacheDir) => path.join(cacheDir, 'fonts', f.file);

/** Download jobs: {url, dest, sha256}. */
export function fontDownloads(recipe, cacheDir) {
  return recipe.fonts.map((f) => ({
    url: recipe.baseUrl + f.src.split('/').map(encodeURIComponent).join('/'),
    dest: cached(f, cacheDir),
    sha256: f.sha256,
  }));
}

/** Output files, relative to the output directory. */
export function fontFiles(recipe) {
  return recipe.fonts.map((f) => f.file);
}

/** Copy the verified downloads into `outDir`. */
export async function buildFonts(recipe, {cacheDir, outDir, onDone}) {
  fs.mkdirSync(outDir, {recursive: true});
  for (const f of recipe.fonts) {
    fs.copyFileSync(cached(f, cacheDir), path.join(outDir, f.file));
    onDone?.(f.file);
  }
}
