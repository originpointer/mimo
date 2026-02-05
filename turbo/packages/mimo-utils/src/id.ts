function getCrypto(): Crypto {
  if (!globalThis.crypto) {
    throw new Error(
      "globalThis.crypto is not available (required for ID generation)",
    );
  }

  return globalThis.crypto;
}

function randomUuidV4(): string {
  const cryptoObject = getCrypto();

  if (typeof cryptoObject.randomUUID === "function") {
    return cryptoObject.randomUUID();
  }

  const bytes = new Uint8Array(16);
  cryptoObject.getRandomValues(bytes);

  // RFC 4122: set version to 4 and variant to 10.
  const byte6 = bytes[6] ?? 0;
  const byte8 = bytes[8] ?? 0;
  bytes[6] = (byte6 & 0x0f) | 0x40;
  bytes[8] = (byte8 & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

export function createId(prefix?: string): string {
  const id = randomUuidV4();
  return prefix ? `${prefix}_${id}` : id;
}

export function createTaskId(): string {
  return createId("task");
}

export function createActionId(): string {
  return createId("act");
}

export function createClientId(): string {
  return createId("client");
}

export function createRequestId(): string {
  return createId("req");
}
