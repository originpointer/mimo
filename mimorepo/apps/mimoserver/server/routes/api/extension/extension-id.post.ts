import { eventHandler, readBody } from 'h3';
import { setExtensionRegistration } from '../../../stores/extensionConfigStore';

type Body = {
  extensionId?: string;
  extensionName?: string;
  clientId?: string;
  ua?: string;
  version?: string;
  browserName?: string;
  allowOtherClient?: boolean;
};

export default eventHandler(async (event) => {
  const body = (await readBody(event).catch(() => null)) as Body | null;

  const extensionId = String(body?.extensionId || '').trim();
  const extensionName = String(body?.extensionName || '').trim();
  const clientId = body?.clientId != null ? String(body.clientId).trim() : undefined;

  if (!extensionId || !extensionName) {
    event.node.res.statusCode = 400;
    return { ok: false, error: 'missing extensionId/extensionName' };
  }

  try {
    const saved = await setExtensionRegistration({
      extensionId,
      extensionName,
      clientId: clientId || undefined,
      ua: body?.ua != null ? String(body.ua) : undefined,
      version: body?.version != null ? String(body.version) : undefined,
      browserName: body?.browserName != null ? String(body.browserName) : undefined,
      allowOtherClient: typeof body?.allowOtherClient === 'boolean' ? body.allowOtherClient : undefined,
    });

    return {
      ok: true,
      extensionId,
      extensionName,
      clientId: saved.byId.clientId ?? null,
      updatedAt: saved.byId.updatedAt,
    };
  } catch {
    event.node.res.statusCode = 500;
    return { ok: false, error: 'failed to persist extension registration' };
  }
});

