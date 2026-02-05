import { eventHandler, readBody } from "h3";
import { saveExtensionRecord } from "@/stores/extensionStore";

export default eventHandler(async (event) => {
  const body = (await readBody(event).catch(() => null)) as any;

  const extensionId = String(body?.extensionId || "").trim();
  const extensionName = String(body?.extensionName || "").trim();
  const clientId = String(body?.clientId || "").trim();

  if (!extensionId || !extensionName || !clientId) {
    event.node.res.statusCode = 400;
    return { ok: false, error: { code: "BAD_REQUEST", message: "missing extensionId/extensionName/clientId" } };
  }

  const record = {
    extensionId,
    extensionName,
    clientId,
    ua: body?.ua ? String(body.ua) : undefined,
    version: body?.version ? String(body.version) : undefined,
    browserName: body?.browserName ? String(body.browserName) : undefined,
    allowOtherClient: typeof body?.allowOtherClient === "boolean" ? body.allowOtherClient : undefined,
    socketConnected: false,
    lastSeenAt: Date.now(),
  };

  await saveExtensionRecord(record);

  return { ok: true, data: { registered: true } };
});
