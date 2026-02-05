import { eventHandler, readBody } from "h3";

function resolveBaseUrl(event: any): string {
  const host = event.node.req.headers.host;
  const proto = (event.node.req.headers["x-forwarded-proto"] as string) || "http";
  if (host) return `${proto}://${host}`;
  return process.env.MIMO_BASE_URL || "http://localhost:6006";
}

export default eventHandler(async (event) => {
  const body = (await readBody(event).catch(() => null)) as any;
  const kind = String(body?.kind || "artifact");
  const contentType = String(body?.contentType || "application/octet-stream");

  const runtime = globalThis.__mimo;
  if (!runtime) {
    event.node.res.statusCode = 503;
    return { ok: false, error: { code: "UNAVAILABLE", message: "runtime not ready" } };
  }

  const record = runtime.artifacts.createArtifact({
    kind,
    contentType,
    baseUrl: resolveBaseUrl(event),
  });

  return {
    ok: true,
    data: {
      artifactId: record.artifactId,
      uploadUrl: record.uploadUrl,
      downloadUrl: record.downloadUrl,
      expiresAt: record.expiresAt,
    },
  };
});
