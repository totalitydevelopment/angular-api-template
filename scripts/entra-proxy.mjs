// Local development only: a fixed Entra upstream, never an arbitrary URL proxy.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

const settings = JSON.parse(await readFile(new URL('./entra-local.json', import.meta.url), 'utf8'));
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!guid.test(settings.tenantId) || !guid.test(settings.portalClientId) ||
    !/^[a-z0-9]+$/.test(settings.tenantSubdomain) ||
    settings.portalOrigin !== 'http://localhost:4200') {
  throw new Error('Invalid local Entra proxy configuration.');
}

const paths = new Set([
  '/oauth2/v2.0/initiate', '/oauth2/v2.0/challenge', '/oauth2/v2.0/token',
  '/oauth2/v2.0/introspect', '/oauth2/v2.0/authorize-challenge',
  '/signup/v1.0/start', '/signup/v1.0/challenge', '/signup/v1.0/continue',
]);
const allowedHeaders = [
  'content-type', 'client-request-id', 'return-client-request-id',
  'x-client-sku', 'x-client-ver', 'x-client-os', 'x-client-cpu',
  'x-client-current-telemetry', 'x-client-last-telemetry',
];

const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  const reply = (status, message) => {
    if (response.destroyed || response.writableEnded) return;
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ message }));
  };

  if (request.method === 'GET' && request.url === '/health') {
    reply(200, 'Local Entra proxy is running');
    return;
  }
  if (request.headers.origin !== settings.portalOrigin) {
    reply(403, 'Origin is not allowed');
    return;
  }
  response.setHeader('Access-Control-Allow-Origin', settings.portalOrigin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Expose-Headers', 'client-request-id, x-ms-request-id');
  const path = request.url?.startsWith('/api/') ? request.url.slice(4) : '';
  if (!paths.has(path)) {
    reply(404, 'Endpoint is not allowed');
    return;
  }
  if (request.method === 'OPTIONS') {
    const requestedHeaders = (request.headers['access-control-request-headers'] ?? '')
      .split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    if (request.headers['access-control-request-method'] !== 'POST' ||
        requestedHeaders.some(value => !allowedHeaders.includes(value))) {
      reply(403, 'Preflight is not allowed');
      return;
    }
    response.writeHead(204, {
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': allowedHeaders.join(', '),
    });
    response.end();
    return;
  }
  if (request.method !== 'POST') {
    reply(405, 'Only POST is allowed');
    return;
  }
  if (!request.headers['content-type']?.startsWith('application/x-www-form-urlencoded')) {
    reply(415, 'Form content is required');
    return;
  }

  const abort = new AbortController();
  request.on('aborted', () => abort.abort());
  response.on('close', () => { if (!response.writableEnded) abort.abort(); });
  const timeout = setTimeout(() => abort.abort(), 20_000);
  try {
    const chunks = [];
    let length = 0;
    for await (const chunk of request) {
      length += chunk.length;
      if (length > 65_536) {
        reply(413, 'Request is too large');
        return;
      }
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks).toString('utf8');
    const form = new URLSearchParams(body);
    if (form.getAll('client_id').length !== 1 || form.get('client_id') !== settings.portalClientId) {
      reply(400, 'Client is not allowed');
      return;
    }
    const headers = Object.fromEntries(allowedHeaders
      .filter(name => typeof request.headers[name] === 'string')
      .map(name => [name, request.headers[name]]));
    const upstream = await fetch(
      `https://${settings.tenantSubdomain}.ciamlogin.com/${settings.tenantId}${path}`,
      { method: 'POST', headers, body, signal: abort.signal, redirect: 'manual' },
    );
    if (upstream.status >= 300 && upstream.status < 400) {
      await upstream.body?.cancel();
      reply(502, 'Unexpected upstream redirect');
      return;
    }
    if (!upstream.headers.get('content-type')?.includes('application/json')) {
      await upstream.body?.cancel();
      reply(502, 'Unexpected upstream response');
      return;
    }
    const data = Buffer.from(await upstream.arrayBuffer());
    if (!upstream.ok) {
      // Log only a constrained provider error code; never descriptions, bodies or tokens.
      const errorData = JSON.parse(data.toString('utf8'));
      const errorCode = errorData.error;
      if (typeof errorCode === 'string' && /^[a-z_]+$/.test(errorCode)) {
        const codes = Array.isArray(errorData.error_codes)
          ? errorData.error_codes.filter(Number.isSafeInteger).join(',') : '';
        const aadsts = typeof errorData.error_description === 'string'
          ? errorData.error_description.match(/AADSTS\d+/g)?.join(',') ?? '' : '';
        console.warn(`Entra ${path}: HTTP ${upstream.status}, ${errorCode}, codes=${codes || aadsts}`);
      }
    }
    for (const name of ['client-request-id', 'x-ms-request-id']) {
      const value = upstream.headers.get(name);
      if (value) response.setHeader(name, value);
    }
    response.writeHead(upstream.status, { 'Content-Type': 'application/json' });
    response.end(data);
  } catch {
    reply(502, 'Entra request failed or timed out');
  } finally {
    clearTimeout(timeout);
  }
});
server.requestTimeout = 25_000;
server.headersTimeout = 10_000;
server.listen(3001, '127.0.0.1', () => {
  console.log('Local Entra proxy listening at http://localhost:3001/api (no request/token logging).');
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { server.close(); server.closeAllConnections(); });
}
