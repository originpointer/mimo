function trimLeadingZeros(bytes) {
  let i = 0
  while (i < bytes.length - 1 && bytes[i] === 0) i++
  return bytes.slice(i)
}

function ensurePositive(bytes) {
  // If highest bit is set, prefix 0x00 to keep INTEGER positive
  if (bytes.length > 0 && (bytes[0] & 0x80) === 0x80) {
    const out = new Uint8Array(bytes.length + 1)
    out[0] = 0
    out.set(bytes, 1)
    return out
  }
  return bytes
}

function derLen(len) {
  if (len < 0x80) return new Uint8Array([len])
  const tmp = []
  let x = len
  while (x > 0) {
    tmp.unshift(x & 0xff)
    x >>= 8
  }
  return new Uint8Array([0x80 | tmp.length, ...tmp])
}

export function p1363ToDer(signature, keyBytes = 32) {
  // JOSE ES256 uses P-1363 (r||s), WebCrypto ECDSA commonly expects DER.
  const sig = signature instanceof Uint8Array ? signature : new Uint8Array(signature)
  if (sig.length !== keyBytes * 2) throw new Error("Invalid P-1363 signature length")

  const r = ensurePositive(trimLeadingZeros(sig.slice(0, keyBytes)))
  const s = ensurePositive(trimLeadingZeros(sig.slice(keyBytes)))

  const rLen = derLen(r.length)
  const sLen = derLen(s.length)
  const seqBodyLen = 2 + rLen.length + r.length + 2 + sLen.length + s.length
  const seqLen = derLen(seqBodyLen)

  const out = new Uint8Array(2 + seqLen.length + seqBodyLen)
  let o = 0
  out[o++] = 0x30
  out.set(seqLen, o)
  o += seqLen.length
  out[o++] = 0x02
  out.set(rLen, o)
  o += rLen.length
  out.set(r, o)
  o += r.length
  out[o++] = 0x02
  out.set(sLen, o)
  o += sLen.length
  out.set(s, o)
  return out
}


