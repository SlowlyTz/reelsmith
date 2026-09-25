#!/usr/bin/env node
// Fetch third-party assets from their original public sources and process them reproducibly.
// Recipes live in assets/manifests/*.json; downloads are cached in assets/.cache/ and the
// generated assets/samples/, assets/sfx/ and assets/fonts/ are never committed.
//
//   node tools/fetch-assets.mjs [--only samples|sfx|fonts]... [--force] [--jobs N]
//
// A section is skipped when its outputs exist and its recipe is unchanged since the last
// build (stamp in assets/.cache/). --force rebuilds it anyway; cached downloads are always
// reused, delete assets/.cache/ to fetch them again. Requires ffmpeg and ffprobe on PATH.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {download, mapPool} from './lib/assets-download.mjs';
import {buildFonts, fontDownloads, fontFiles} from './lib/assets-fonts.mjs';
import {buildSamples, sampleDownloads, sampleFiles} from './lib/assets-samples.mjs';
import {buildSfx, sfxDownloads, sfxFiles} from './lib/assets-sfx.mjs';

const ASSETS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets');
const CACHE = path.join(ASSETS, '.cache');

// Per section: download jobs, processed files, build step; `manifest` sections also write
// <section>/manifest.json, `ffmpeg` sections need ffmpeg/ffprobe.
const SECTIONS = {
  samples: {downloads: sampleDownloads, files: sampleFiles, build: buildSamples, manifest: true, ffmpeg: true},
  sfx: {downloads: sfxDownloads, files: sfxFiles, build: buildSfx, manifest: true, ffmpeg: true},
  fonts: {downloads: fontDownloads, files: fontFiles, build: buildFonts, manifest: false, ffmpeg: false},
};

function usage(msg) {
  if (msg) console.error(`error: ${msg}`);
  console.error('usage: node tools/fetch-assets.mjs [--only samples|sfx|fonts]... [--force] [--jobs N]');
  process.exit(2);
}

function options() {
  let values;
  try {
    ({values} = parseArgs({
      options: {
        only: {type: 'string', multiple: true},
        force: {type: 'boolean', default: false},
        jobs: {type: 'string', default: String(Math.min(8, os.availableParallelism()))},
        help: {type: 'boolean', short: 'h', default: false},
      },
    }));
  } catch (err) {
    usage(err.message);
  }
  if (values.help) usage();
  const only = (values.only ?? Object.keys(SECTIONS)).flatMap((s) => s.split(','));
  for (const s of only) if (!SECTIONS[s]) usage(`unknown section "${s}"`);
  const jobs = Number(values.jobs);
  if (!Number.isInteger(jobs) || jobs < 1) usage('--jobs must be a positive integer');
  return {sections: Object.keys(SECTIONS).filter((s) => only.includes(s)), force: values.force, jobs};
}

// One-line progress counter: rewritten in place on a TTY, a single summary line otherwise.
function progress(label, total) {
  const tty = process.stdout.isTTY;
  let n = 0;
  const line = () => `  ${label} ${n}/${total}`;
  return {
    tick() {
      n++;
      if (tty) process.stdout.write(`\r${line()}`);
    },
    done(extra = '') {
      process.stdout.write(`${tty ? '\r' : ''}${line()}${extra}\n`);
    },
  };
}

function requireFfmpeg() {
  for (const bin of ['ffmpeg', 'ffprobe']) {
    try {
      execFileSync(bin, ['-version'], {stdio: 'ignore'});
    } catch {
      throw new Error(`${bin} not found on PATH`);
    }
  }
}

const dirSize = (dir) =>
  fs.readdirSync(dir, {recursive: true})
    .map((f) => fs.statSync(path.join(dir, f)))
    .reduce((sum, st) => sum + (st.isFile() ? st.size : 0), 0);

async function runSection(name, {force, jobs}) {
  const section = SECTIONS[name];
  const recipeText = fs.readFileSync(path.join(ASSETS, 'manifests', `${name}.json`), 'utf8');
  const recipe = JSON.parse(recipeText);
  const outDir = path.join(ASSETS, name);
  const stampFile = path.join(CACHE, `${name}.stamp`);
  const stamp = createHash('sha256').update(recipeText).digest('hex');

  const files = section.files(recipe);
  const outputs = section.manifest ? [...files, 'manifest.json'] : files;
  const current = fs.existsSync(stampFile) && fs.readFileSync(stampFile, 'utf8') === stamp;
  if (!force && current && outputs.every((f) => fs.existsSync(path.join(outDir, f)))) {
    console.log(`${name}: up to date (${outputs.length} files)`);
    return;
  }
  console.log(`${name}:`);
  if (section.ffmpeg) requireFfmpeg();

  const jobsList = section.downloads(recipe, CACHE);
  const dl = progress('download', jobsList.length);
  let fetched = 0;
  await mapPool(jobsList, jobs, async (j) => {
    if (await download(j.url, j.dest, {sha256: j.sha256})) fetched++;
    dl.tick();
  });
  dl.done(` (${fetched} new, ${jobsList.length - fetched} cached)`);

  // The output directory is fully generated: start clean so removed recipe entries disappear.
  fs.rmSync(stampFile, {force: true});
  fs.rmSync(outDir, {recursive: true, force: true});
  const proc = progress('process ', files.length);
  await section.build(recipe, {cacheDir: CACHE, outDir, limit: jobs, onDone: proc.tick});
  proc.done(` -> ${path.relative(process.cwd(), outDir) || outDir} (${(dirSize(outDir) / 1e6).toFixed(1)} MB)`);
  fs.writeFileSync(stampFile, stamp);
}

async function main() {
  const opts = options();
  const t0 = performance.now();
  const failed = [];
  for (const name of opts.sections) {
    try {
      await runSection(name, opts);
    } catch (err) {
      if (process.stdout.isTTY) process.stdout.write('\n'); // end a progress line
      console.error(`${name}: FAILED\n  ${err.message}`);
      failed.push(name);
    }
  }
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  if (failed.length) {
    console.error(`failed: ${failed.join(', ')} (${secs} s)`);
    process.exit(1);
  }
  console.log(`done in ${secs} s`);
}

await main();
