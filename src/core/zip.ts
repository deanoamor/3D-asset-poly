/** Minimal ZIP writer (single file, "stored" = no compression). Enough to wrap a .glb for hosts that only allow a few extensions. */
const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  name: string;
  data: Uint8Array | string;
}

/** Store-only ZIP with any number of files. */
export function zipFiles(entries: ZipEntry[], date = new Date()): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const items = entries.map((e) => {
    const data = typeof e.data === 'string' ? enc.encode(e.data) : e.data;
    return { name: enc.encode(e.name), data, crc: crc32(data) };
  });
  const localTotal = items.reduce((a, f) => a + 30 + f.name.length + f.data.length, 0);
  const centralTotal = items.reduce((a, f) => a + 46 + f.name.length, 0);
  const out = new Uint8Array(new ArrayBuffer(localTotal + centralTotal + 22));
  const v = new DataView(out.buffer);
  let o = 0;
  const offsets: number[] = [];
  for (const f of items) {
    offsets.push(o);
    v.setUint32(o, 0x04034b50, true); v.setUint16(o + 4, 20, true); v.setUint16(o + 6, 0x0800, true);
    v.setUint16(o + 8, 0, true); v.setUint16(o + 10, dosTime, true); v.setUint16(o + 12, dosDate, true);
    v.setUint32(o + 14, f.crc, true); v.setUint32(o + 18, f.data.length, true); v.setUint32(o + 22, f.data.length, true);
    v.setUint16(o + 26, f.name.length, true); v.setUint16(o + 28, 0, true);
    out.set(f.name, o + 30);
    out.set(f.data, o + 30 + f.name.length);
    o += 30 + f.name.length + f.data.length;
  }
  const cdStart = o;
  items.forEach((f, i) => {
    v.setUint32(o, 0x02014b50, true); v.setUint16(o + 4, 20, true); v.setUint16(o + 6, 20, true); v.setUint16(o + 8, 0x0800, true);
    v.setUint16(o + 10, 0, true); v.setUint16(o + 12, dosTime, true); v.setUint16(o + 14, dosDate, true);
    v.setUint32(o + 16, f.crc, true); v.setUint32(o + 20, f.data.length, true); v.setUint32(o + 24, f.data.length, true);
    v.setUint16(o + 28, f.name.length, true); v.setUint16(o + 30, 0, true); v.setUint16(o + 32, 0, true);
    v.setUint16(o + 34, 0, true); v.setUint16(o + 36, 0, true); v.setUint32(o + 38, 0, true); v.setUint32(o + 42, offsets[i], true);
    out.set(f.name, o + 46);
    o += 46 + f.name.length;
  });
  v.setUint32(o, 0x06054b50, true); v.setUint16(o + 4, 0, true); v.setUint16(o + 6, 0, true);
  v.setUint16(o + 8, items.length, true); v.setUint16(o + 10, items.length, true);
  v.setUint32(o + 12, o - cdStart, true); v.setUint32(o + 16, cdStart, true); v.setUint16(o + 20, 0, true);
  return out;
}

export function zipSingle(filename: string, data: Uint8Array, date = new Date()): Uint8Array<ArrayBuffer> {
  return zipFiles([{ name: filename, data }], date);
}
