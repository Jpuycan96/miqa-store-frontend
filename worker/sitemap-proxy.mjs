export const SITEMAP_TIMEOUT_MS = 10_000;

const XML_CONTENT_TYPE = /^(?:application|text)\/xml(?:\s*;|$)/i;
const XML_DECLARATION = /^<\?xml[ \t\r\n]+version=(['"])1\.0\1(?:[ \t\r\n]+encoding=(['"])UTF-8\2)?[ \t\r\n]*\?>/i;
const URLSET = /^<urlset[ \t\r\n]+xmlns=(['"])http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9\1[ \t\r\n]*>([\s\S]*)<\/urlset>$/;
const trimXml = text => text.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');

function isXmlCharacter(code) {
  return code === 9 || code === 10 || code === 13 ||
    (code >= 0x20 && code <= 0xd7ff) || (code >= 0xe000 && code <= 0xfffd) ||
    (code >= 0x10000 && code <= 0x10ffff);
}

// Validate the backend's urlset/url/loc contract without a browser DOM or dependencies.
// DTDs, additional elements and undeclared entities are deliberately unsupported.
function isSitemapXml(body) {
  for (const character of body) {
    if (!isXmlCharacter(character.codePointAt(0))) return false;
  }
  const document = trimXml(body.replace(/^\uFEFF/, ''));
  const root = trimXml(document.replace(XML_DECLARATION, '')).match(URLSET);
  if (!root) return false;
  const entries = trimXml(root[2]);
  const entry = /<url>[ \t\r\n]*<loc>([^<>]+)<\/loc>[ \t\r\n]*<\/url>[ \t\r\n]*/y;
  let offset = 0;
  let count = 0;
  while (offset < entries.length) {
    entry.lastIndex = offset;
    const match = entry.exec(entries);
    if (!match || !match[1].trim() || match[1].includes(']]>')) return false;
    const text = match[1].replace(/&(?:amp|lt|gt|quot|apos|#([0-9]+)|#x([0-9a-fA-F]+));/g,
      (entity, decimal, hex) => {
        if (decimal === undefined && hex === undefined) return '_';
        const code = Number.parseInt(decimal ?? hex, decimal === undefined ? 16 : 10);
        return isXmlCharacter(code) ? '_' : '\u0000';
      });
    if (text.includes('&') || text.includes('\u0000')) {
      return false;
    }
    offset = entry.lastIndex;
    count++;
  }
  return count > 0;
}

function errorResponse(request, status, extraHeaders = {}) {
  return new Response(request.method === 'HEAD' ? null : 'Sitemap no disponible.\n', {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

export function createWorker({ fetchImpl = globalThis.fetch } = {}) {
  return {
    async fetch(request, env) {
      if (new URL(request.url).pathname !== '/sitemap.xml') {
        return env.ASSETS.fetch(request);
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return errorResponse(request, 405, { Allow: 'GET, HEAD' });
      }

      let backendUrl;
      try {
        backendUrl = new URL(env.SITEMAP_BACKEND_URL);
        if (!['http:', 'https:'].includes(backendUrl.protocol) || backendUrl.username ||
            backendUrl.password || backendUrl.search || backendUrl.hash) {
          return errorResponse(request, 500);
        }
      } catch {
        return errorResponse(request, 500);
      }

      const controller = new AbortController();
      let timedOut = false;
      let timer;
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(new Error('Sitemap timeout'));
        }, SITEMAP_TIMEOUT_MS);
      });
      try {
        const result = await Promise.race([
          (async () => {
            // Always GET upstream, even for HEAD: validate the complete document.
            // No part of the visitor's headers, query or credentials is forwarded.
            const upstream = await fetchImpl(backendUrl.href, {
              method: 'GET',
              headers: { Accept: 'application/xml' },
              redirect: 'manual',
              cache: 'no-store',
              signal: controller.signal,
            });
            if (upstream.status !== 200) {
              controller.abort();
              return errorResponse(request, upstream.status >= 500 && upstream.status <= 599
                ? upstream.status : 502);
            }
            if (!XML_CONTENT_TYPE.test(upstream.headers.get('Content-Type') ?? '')) {
              controller.abort();
              return errorResponse(request, 502);
            }
            const body = await upstream.text();
            if (!isSitemapXml(body)) return errorResponse(request, 502);
            return new Response(request.method === 'HEAD' ? null : body, {
              status: 200,
              headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'no-store',
              },
            });
          })(),
          deadline,
        ]);
        return result;
      } catch {
        controller.abort();
        return errorResponse(request, timedOut ? 504 : 502);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

