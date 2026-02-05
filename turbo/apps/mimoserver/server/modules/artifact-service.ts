import fs from "node:fs/promises";
import path from "node:path";
import { createId } from "@repo/mimo-utils";

export type ArtifactRecord = {
  artifactId: string;
  kind: string;
  contentType: string;
  filePath: string;
  expiresAt: number;
  downloadUrl: string;
  uploadUrl: string;
};

export class ArtifactService {
  private readonly records = new Map<string, ArtifactRecord>();
  private readonly baseDir: string;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(baseDir = "./uploads/artifacts") {
    this.baseDir = baseDir;
  }

  async init(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
    this.cleanupExpired();
    this.cleanupTimer = setInterval(() => this.cleanupExpired(), 6 * 60 * 60 * 1000);
  }

  stop(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  createArtifact(params: {
    kind: string;
    contentType: string;
    baseUrl: string;
    ttlMs?: number;
  }): ArtifactRecord {
    const artifactId = createId("art");
    const expiresAt = Date.now() + (params.ttlMs ?? 15 * 60 * 1000);
    const filePath = path.join(this.baseDir, artifactId);

    const downloadUrl = `${params.baseUrl}/api/artifacts/${artifactId}`;
    const uploadUrl = `${params.baseUrl}/api/artifacts/${artifactId}/upload`;

    const record: ArtifactRecord = {
      artifactId,
      kind: params.kind,
      contentType: params.contentType,
      filePath,
      expiresAt,
      downloadUrl,
      uploadUrl,
    };

    this.records.set(artifactId, record);
    return record;
  }

  getArtifact(artifactId: string): ArtifactRecord | null {
    const record = this.records.get(artifactId) ?? null;
    if (!record) return null;
    if (record.expiresAt < Date.now()) return null;
    return record;
  }

  async saveFile(artifactId: string, data: Buffer): Promise<ArtifactRecord | null> {
    const record = this.getArtifact(artifactId);
    if (!record) return null;
    await fs.mkdir(path.dirname(record.filePath), { recursive: true });
    await fs.writeFile(record.filePath, data);
    return record;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [id, record] of this.records.entries()) {
      if (record.expiresAt < now) {
        this.records.delete(id);
        fs.rm(record.filePath, { force: true }).catch(() => null);
      }
    }
  }
}
