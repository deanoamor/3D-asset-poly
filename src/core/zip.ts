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

export function zipSingle(filename: string, data: Uint8Array, date = new Date()): Uint8Array<ArrayBuffer> {
  const name = new TextEncoder().encode(filename);
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const crc = crc32(data);
  const localSize = 30 + name.length;
  const centralSize = 46 + name.length;
  const out = new Uint8Array(new ArrayBuffer(localSize + data.length + centralSize + 22));
  const v = new DataView(out.buffer);
  let o = 0;
  // local file header
  v.setUint32(o, 0x04034b50, true); v.setUint16(o + 4, 20, true); v.setUint16(o + 6, 0x0800, true); // UTF-8 names
  v.setUint16(o + 8, 0, true); v.setUint16(o + 10, dosTime, true); v.setUint16(o + 12, dosDate, true);
  v.setUint32(o + 14, crc, true); v.setUint32(o + 18, data.length, true); v.setUint32(o + 22, data.length, true);
  v.setUint16(o + 26, name.length, true); v.setUint16(o + 28, 0, true);
  out.set(name, o + 30);
  o += localSize;
  out.set(data, o);
  o += data.length;
  // central directory
  const cdStart = o;
  v.setUint32(o, 0x02014b50, true); v.setUint16(o + 4, 20, true); v.setUint16(o + 6, 20, true); v.setUint16(o + 8, 0x0800, true);
  v.setUint16(o + 10, 0, true); v.setUint16(o + 12, dosTime, true); v.setUint16(o + 14, dosDate, true);
  v.setUint32(o + 16, crc, true); v.setUint32(o + 20, data.length, true); v.setUint32(o + 24, data.length, true);
  v.setUint16(o + 28, name.length, true); v.setUint16(o + 30, 0, true); v.setUint16(o + 32, 0, true);
  v.setUint16(o + 34, 0, true); v.setUint16(o + 36, 0, true); v.setUint32(o + 38, 0, true); v.setUint32(o + 42, 0, true);
  out.set(name, o + 46);
  o += centralSize;
  // end of central directory
  v.setUint32(o, 0x06054b50, true); v.setUint16(o + 4, 0, true); v.setUint16(o + 6, 0, true);
  v.setUint16(o + 8, 1, true); v.setUint16(o + 10, 1, true);
  v.setUint32(o + 12, centralSize, true); v.setUint32(o + 16, cdStart, true); v.setUint16(o + 20, 0, true);
  return out;
}
