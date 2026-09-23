/** Build a stored-method ZIP so quarantine tests do not shell out. */
export function storedZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = new TextEncoder().encode(file.name);
    const local = new Uint8Array(30 + name.length + file.data.length);
    local.set([0x50, 0x4b, 0x03, 0x04]);
    writeU16(local, 8, 0);
    writeU32(local, 18, file.data.length);
    writeU32(local, 22, file.data.length);
    writeU16(local, 26, name.length);
    local.set(name, 30);
    local.set(file.data, 30 + name.length);
    locals.push(local);
    const central = new Uint8Array(46 + name.length);
    central.set([0x50, 0x4b, 0x01, 0x02]);
    writeU16(central, 10, 0);
    writeU32(central, 20, file.data.length);
    writeU32(central, 24, file.data.length);
    writeU16(central, 28, name.length);
    writeU32(central, 42, offset);
    central.set(name, 46);
    centrals.push(central);
    offset += local.length;
  }
  const cdSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const eocd = new Uint8Array(22);
  eocd.set([0x50, 0x4b, 0x05, 0x06]);
  writeU16(eocd, 8, files.length);
  writeU16(eocd, 10, files.length);
  writeU32(eocd, 12, cdSize);
  writeU32(eocd, 16, offset);
  return concat([...locals, ...centrals, eocd]);
}

/** Central-directory-only bomb: claimed sizes are hostile, payload is tiny. */
export function declaredBomb(uncompressed: number, compressed: number): Uint8Array {
  const name = new TextEncoder().encode("bomb.txt");
  const payload = new Uint8Array(compressed);
  const local = new Uint8Array(30 + name.length + payload.length);
  local.set([0x50, 0x4b, 0x03, 0x04]);
  writeU32(local, 18, compressed);
  writeU32(local, 22, uncompressed);
  writeU16(local, 26, name.length);
  local.set(name, 30);
  const central = new Uint8Array(46 + name.length);
  central.set([0x50, 0x4b, 0x01, 0x02]);
  writeU32(central, 20, compressed);
  writeU32(central, 24, uncompressed);
  writeU16(central, 28, name.length);
  writeU32(central, 42, 0);
  central.set(name, 46);
  const eocd = new Uint8Array(22);
  eocd.set([0x50, 0x4b, 0x05, 0x06]);
  writeU16(eocd, 8, 1);
  writeU16(eocd, 10, 1);
  writeU32(eocd, 12, central.length);
  writeU32(eocd, 16, local.length);
  return concat([local, central, eocd]);
}

function writeU16(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
}

function writeU32(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
  buf[offset + 3] = (value >> 24) & 0xff;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
