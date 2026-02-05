import { eventHandler, getRouterParam, setHeader } from "h3";
import fs from "node:fs/promises";

export default eventHandler(async (event) => {
  const artifactId = getRouterParam(event, "artifactId");
  if (!artifactId) {
    event.node.res.statusCode = 400;
    return { ok: false, error: { code: "BAD_REQUEST", message: "missing artifactId" } };
  }

  const runtime = globalThis.__mimo;
  const record = runtime?.artifacts.getArtifact(artifactId);
  if (!record) {
    event.node.res.statusCode = 404;
    return { ok: false, error: { code: "NOT_FOUND", message: "artifact not found" } };
  }

  try {
    const data = await fs.readFile(record.filePath);
    setHeader(event, "Content-Type", record.contentType || "application/octet-stream");
    return data;
  } catch {
    event.node.res.statusCode = 404;
    return { ok: false, error: { code: "NOT_FOUND", message: "artifact missing" } };
  }
});
