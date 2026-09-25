// Minimal zip reader: extract one entry (stored or deflated) via the central directory.
// Enough for asset packs; no zip64, encryption or multi-disk archives.
import fs from 'node:fs';
import {inflateRawSync} from 'node:zlib';

const EOCD = 0x06054b50, CENTRAL = 0x02014b50, LOCAL = 0x04034b50;

/** Return the bytes of the entry at `entryPath` inside the zip file `zipFile`. */
export function extractZipEntry(zipFile, entryPath) {
  const buf = fs.readFileSync(zipFile);
  // End-of-central-directory record: last 22 bytes plus an optional comment of up to 64 KiB.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (buf.readUInt32LE(i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error(`${zipFile}: not a zip archive`);
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== CENTRAL) throw new Error(`${zipFile}: corrupt central directory`);
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    if (name === entryPath) {
      if (buf.readUInt32LE(local) !== LOCAL) throw new Error(`${zipFile}: corrupt local header for ${name}`);
      const data = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const raw = buf.subarray(data, data + size);
      if (method === 0) return raw;
      if (method === 8) return inflateRawSync(raw);
      throw new Error(`${zipFile}: unsupported compression method ${method} for ${name}`);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`${zipFile}: entry not found: ${entryPath}`);
}
