import { eventHandler, getRouterParam, readRawBody } from "h3";

export default eventHandler(async (event) => {
  const artifactId = getRouterParam(event, "artifactId");
  if (!artifactId) {
    event.node.res.statusCode = 400;
    return { ok: false, error: { code: "BAD_REQUEST", message: "missing artifactId" } };
  }

  const runtime = globalThis.__mimo;
  if (!runtime) {
    event.node.res.statusCode = 503;
    return { ok: false, error: { code: "UNAVAILABLE", message: "runtime not ready" } };
  }

  const data = await readRawBody(event);
  if (!data) {
    event.node.res.statusCode = 400;
    return { ok: false, error: { code: "BAD_REQUEST", message: "empty body" } };
  }

  const saved = await runtime.artifacts.saveFile(artifactId, Buffer.from(data));
  if (!saved) {
    event.node.res.statusCode = 404;
    return { ok: false, error: { code: "NOT_FOUND", message: "artifact expired" } };
  }

  return { ok: true, data: { uploaded: true, downloadUrl: saved.downloadUrl } };
});
