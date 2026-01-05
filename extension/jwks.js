import { base64urlToBytes, bytesToUtf8, utf8ToBytes } from "./base64url.js"
import { p1363ToDer } from "./ecdsa.js"

const JWKS_CACHE_KEY = "control.jwksCache.v1"

async function loadCachedJwks() {
  try {
    const obj = await chrome.storage.local.get(JWKS_CACHE_KEY)
    return obj?.[JWKS_CACHE_KEY] ?? null
  } catch {
    return null
  }
}

async function saveCachedJwks(value) {
  try {
    await chrome.storage.local.set({ [JWKS_CACHE_KEY]: value })
  } catch {
    // ignore
  }
}

async function fetchJwks(jwksUrl) {
  const res = await fetch(jwksUrl, { method: "GET", cache: "no-store" })
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`)
  const data = await res.json()
  if (!data || !Array.isArray(data.keys)) throw new Error("Invalid JWKS")
  return data
}

async function importVerifyKey(jwk) {
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  )
}

export async function verifyJwsEs256(params) {
  const { jws, jwksUrl, clockSkewMs = 60_000 } = params
  const parts = String(jws || "").split(".")
  if (parts.length !== 3) throw new Error("Invalid JWS compact format")

  const header = JSON.parse(bytesToUtf8(base64urlToBytes(parts[0])))
  const payload = JSON.parse(bytesToUtf8(base64urlToBytes(parts[1])))
  const sigP1363 = base64urlToBytes(parts[2])
  const signingInput = utf8ToBytes(parts[0] + "." + parts[1])

  if (header.alg !== "ES256") throw new Error("Unsupported alg")
  const kid = header.kid
  if (!kid) throw new Error("Missing kid")

  const now = Date.now()
  const issuedAt = Number(payload.issuedAt)
  const ttlMs = Number(payload.ttlMs)
  if (!Number.isFinite(issuedAt) || !Number.isFinite(ttlMs)) throw new Error("Missing issuedAt/ttlMs")
  if (now > issuedAt + ttlMs + clockSkewMs) throw new Error("Command expired")

  const cached = await loadCachedJwks()
  let jwks = cached?.jwks ?? null
  let fetchedAt = cached?.fetchedAt ?? 0

  const needsRefresh = !jwks || now - fetchedAt > 5 * 60_000 // 5min cache
  if (needsRefresh) {
    jwks = await fetchJwks(jwksUrl)
    fetchedAt = now
    await saveCachedJwks({ jwks, fetchedAt })
  }

  let jwk = jwks.keys.find((k) => k.kid === kid)
  if (!jwk) {
    // kid miss: refresh once
    jwks = await fetchJwks(jwksUrl)
    fetchedAt = now
    await saveCachedJwks({ jwks, fetchedAt })
    jwk = jwks.keys.find((k) => k.kid === kid)
  }
  if (!jwk) throw new Error("Unknown kid")

  const key = await importVerifyKey(jwk)

  // NOTE: 不同运行时对 WebCrypto ECDSA signature 编码期望不完全一致：
  // - JOSE/JWS (ES256) 的签名是 P-1363 (r||s)
  // - 部分 WebCrypto 实现 verify 期望 DER 编码
  // 因此这里做双尝试：先按原始 P-1363 验，再 fallback 为 DER。
  let ok = false
  try {
    ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, sigP1363, signingInput)
  } catch {
    ok = false
  }
  if (!ok) {
    const sigDer = p1363ToDer(sigP1363, 32)
    ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, sigDer, signingInput)
  }
  if (!ok) throw new Error("Invalid signature")

  return { header, payload }
}


