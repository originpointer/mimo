import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

export type TestRouteResult =
  | {
      status?: number;
      headers?: Record<string, string>;
      body?: string;
    }
  | string;

export type TestRouteHandler = (
  req: IncomingMessage
) => TestRouteResult | Promise<TestRouteResult>;

export async function startTestServer(routes: Record<string, TestRouteHandler>) {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const handler = routes[url.pathname];
      if (!handler) {
        res.statusCode = 404;
        res.setHeader('content-type', 'text/plain; charset=utf-8');
        res.end('not found');
        return;
      }

      const out = await handler(req);
      const result: Exclude<TestRouteResult, string> =
        typeof out === 'string' ? { body: out } : out;

      res.statusCode = result.status ?? 200;
      for (const [k, v] of Object.entries(result.headers ?? {})) {
        res.setHeader(k, v);
      }
      if (!res.getHeader('content-type')) {
        res.setHeader('content-type', 'text/html; charset=utf-8');
      }
      res.end(result.body ?? '');
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      res.end(err instanceof Error ? err.stack ?? err.message : String(err));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unexpected server address');
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    url: (path: string) => new URL(path, baseUrl).toString(),
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close(err => (err ? reject(err) : resolve()));
      });
    },
  };
}

