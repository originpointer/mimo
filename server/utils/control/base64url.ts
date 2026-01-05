export function base64urlEncode(input: Uint8Array | Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input)
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")
}

export function base64urlEncodeJson(value: unknown): string {
  return base64urlEncode(JSON.stringify(value))
}


