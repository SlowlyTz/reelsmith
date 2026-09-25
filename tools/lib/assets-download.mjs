// Cached, resumable HTTP downloads plus a small concurrency pool.
// A file lands at its final path only when complete; partial data lives in `<dest>.part`
// and is continued with a Range request on the next run.
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';

const RETRIES = 4;

/** Run `fn(item, index)` over `items` with at most `limit` calls in flight. Rejects on the first error. */
export async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({length: Math.min(limit, items.length)}, worker));
  return results;
}

export async function sha256File(file) {
  const hash = createHash('sha256');
  await pipeline(fs.createReadStream(file), hash);
  return hash.digest('hex');
}

/**
 * Download `url` to `dest` unless it already exists. Verifies `sha256` when given.
 * Returns true if something was fetched, false on a cache hit.
 */
export async function download(url, dest, {sha256} = {}) {
  if (fs.existsSync(dest)) return false;
  fs.mkdirSync(path.dirname(dest), {recursive: true});
  const part = `${dest}.part`;
  for (let attempt = 1; ; attempt++) {
    try {
      await fetchInto(url, part);
      break;
    } catch (err) {
      if (attempt >= RETRIES || err.permanent) throw new Error(`download failed: ${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  if (sha256) {
    const got = await sha256File(part);
    if (got !== sha256) {
      fs.rmSync(part);
      throw new Error(`checksum mismatch: ${url}\n  expected ${sha256}\n  got      ${got}`);
    }
  }
  fs.renameSync(part, dest);
  return true;
}

// Append to `part`, resuming from its current size when the server honours Range.
async function fetchInto(url, part) {
  const have = fs.existsSync(part) ? fs.statSync(part).size : 0;
  const res = await fetch(url, {headers: have ? {Range: `bytes=${have}-`} : {}, redirect: 'follow'});
  if (res.status === 416) return; // already complete
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.permanent = res.status >= 400 && res.status < 500 && res.status !== 429;
    throw err;
  }
  const append = have > 0 && res.status === 206;
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(part, {flags: append ? 'a' : 'w'}));
}
