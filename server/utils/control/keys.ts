import crypto from "node:crypto"
import { base64urlEncode, base64urlEncodeJson } from "./base64url"

export type JwkPublicKey = {
  kty: "EC"
  crv: "P-256"
  x: string
  y: string
  kid: string
  alg: "ES256"
  use: "sig"
}

type KeyState = {
  kid: string
  publicJwk: JwkPublicKey
  privateKey: crypto.KeyObject
}

let cached: KeyState | null = null

function computeKidFromPublicJwk(jwk: Omit<JwkPublicKey, "kid" | "alg" | "use">): string {
  // Stable kid: base64url(sha256(canonicalFieldsJson))
  const canonical = { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y }
  const digest = crypto.createHash("sha256").update(JSON.stringify(canonical)).digest()
  return base64urlEncode(digest)
}

export function getOrCreateKeyState(): KeyState {
  if (cached) return cached

  // NOTE: 当前为进程内生成（开发/验收友好）。生产建议从环境变量加载固定私钥并做轮换。
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" })
  const jwk = publicKey.export({ format: "jwk" }) as any

  if (!jwk || jwk.kty !== "EC" || jwk.crv !== "P-256" || typeof jwk.x !== "string" || typeof jwk.y !== "string") {
    throw new Error("Failed to export public key as P-256 JWK")
  }

  const kid = computeKidFromPublicJwk({ kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y })
  const publicJwk: JwkPublicKey = { kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y, kid, alg: "ES256", use: "sig" }

  cached = { kid, publicJwk, privateKey }
  return cached
}

export function getJwks(): { keys: JwkPublicKey[] } {
  const { publicJwk } = getOrCreateKeyState()
  return { keys: [publicJwk] }
}

export function signJws(payload: unknown): { jws: string; kid: string } {
  const { kid, privateKey } = getOrCreateKeyState()
  const header = { alg: "ES256", kid, typ: "JWT" }
  const signingInput = `${base64urlEncodeJson(header)}.${base64urlEncodeJson(payload)}`
  const sig = crypto.sign("sha256", Buffer.from(signingInput, "utf8"), { key: privateKey, dsaEncoding: "ieee-p1363" })
  const jws = `${signingInput}.${base64urlEncode(sig)}`
  return { jws, kid }
}


