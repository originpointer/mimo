export function base64urlToBytes(input) {
  const s = String(input || "").replace(/-/g, "+").replace(/_/g, "/")
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : ""
  const b64 = s + pad
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function bytesToUtf8(bytes) {
  return new TextDecoder().decode(bytes)
}

export function utf8ToBytes(s) {
  return new TextEncoder().encode(String(s))
}




