import crypto from "node:crypto"

type ZipFile = { path: string; data: Buffer }

// Minimal CRC32 implementation (table-based)
const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c >>> 0
  }
  return table
})()

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function dosDateTime(ts: number): { date: number; time: number } {
  const d = new Date(ts)
  const year = Math.max(1980, d.getFullYear())
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hours = d.getHours()
  const minutes = d.getMinutes()
  const seconds = Math.floor(d.getSeconds() / 2)
  const dosTime = (hours << 11) | (minutes << 5) | seconds
  const dosDate = ((year - 1980) << 9) | (month << 5) | day
  return { date: dosDate & 0xffff, time: dosTime & 0xffff }
}

function sanitizePath(p: string): string {
  // zip uses forward slashes. Prevent absolute/parent traversal.
  const s = p.replace(/\\/g, "/").replace(/^\/+/, "")
  const parts = s.split("/").filter((x) => x && x !== "." && x !== "..")
  return parts.join("/")
}

export function createZipStore(files: ZipFile[], opts?: { mtimeMs?: number }): Buffer {
  const mtime = typeof opts?.mtimeMs === "number" ? opts.mtimeMs : Date.now()
  const { date, time } = dosDateTime(mtime)

  const localHeaders: Buffer[] = []
  const centralHeaders: Buffer[] = []
  let offset = 0

  for (const f of files) {
    const fileName = Buffer.from(sanitizePath(f.path), "utf8")
    const data = f.data
    const c = crc32(data)
    const compSize = data.length
    const uncompSize = data.length

    // Local file header
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0) // signature
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0, 6) // flags
    local.writeUInt16LE(0, 8) // compression method: store
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    local.writeUInt32LE(c, 14)
    local.writeUInt32LE(compSize, 18)
    local.writeUInt32LE(uncompSize, 22)
    local.writeUInt16LE(fileName.length, 26)
    local.writeUInt16LE(0, 28) // extra length

    localHeaders.push(local, fileName, data)

    // Central directory header
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0) // signature
    central.writeUInt16LE(20, 4) // version made by
    central.writeUInt16LE(20, 6) // version needed
    central.writeUInt16LE(0, 8) // flags
    central.writeUInt16LE(0, 10) // compression
    central.writeUInt16LE(time, 12)
    central.writeUInt16LE(date, 14)
    central.writeUInt32LE(c, 16)
    central.writeUInt32LE(compSize, 20)
    central.writeUInt32LE(uncompSize, 24)
    central.writeUInt16LE(fileName.length, 28)
    central.writeUInt16LE(0, 30) // extra
    central.writeUInt16LE(0, 32) // comment
    central.writeUInt16LE(0, 34) // disk start
    central.writeUInt16LE(0, 36) // internal attrs
    central.writeUInt32LE(0, 38) // external attrs
    central.writeUInt32LE(offset, 42) // local header offset

    centralHeaders.push(central, fileName)

    offset += local.length + fileName.length + data.length
  }

  const centralStart = offset
  const centralBuf = Buffer.concat(centralHeaders)
  const centralSize = centralBuf.length
  offset += centralSize

  // End of central directory
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4) // disk
  eocd.writeUInt16LE(0, 6) // start disk
  eocd.writeUInt16LE(files.length, 8)
  eocd.writeUInt16LE(files.length, 10)
  eocd.writeUInt32LE(centralSize, 12)
  eocd.writeUInt32LE(centralStart, 16)
  eocd.writeUInt16LE(0, 20) // comment length

  // Add a random comment-less zip; name is via headers.
  void crypto.randomBytes(1) // keep crypto import from being tree-shaken in some builds
  return Buffer.concat([...localHeaders, centralBuf, eocd])
}


