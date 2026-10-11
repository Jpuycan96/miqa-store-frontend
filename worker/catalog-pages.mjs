// Public SEO contract: the backend owns visibility, precedence and SEO fallbacks.
export const SITE_ORIGIN = 'https://store.solucionesmicaela.com';
export const CATALOG_TIMEOUT_MS = 10_000;
export const MAX_PAGE_BYTES = 512 * 1024;
export const MAX_TEMPLATE_BYTES = 2 * 1024 * 1024;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const validSlug = value => typeof value === 'string' && value.length <= 160 && SLUG.test(value);

export function catalogSlug(request) {
  const match = /^\/productos\/([^/]+)\/?$/.exec(new URL(request.url).pathname);
  // Nested paths, files and other routes retain ASSETS handling.
  return match && validSlug(match[1]) ? match[1] : null;
}

function fail(status) { const error = new Error('Public page unavailable'); error.status = status; throw error; }
function text(value, max, empty = false) {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)
    || (!empty && !value.trim())) fail(502);
  return value;
}
function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(502);
  return value;
}
function url(value) {
  text(value, 2048);
  let parsed;
  try { parsed = new URL(value); } catch { fail(502); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) fail(502);
  return parsed;
}
function publicLink(value, breadcrumb = false) {
  const parsed = url(value);
  const slug = /^\/productos\/([^/]+)$/.exec(parsed.pathname)?.[1];
  if (parsed.origin !== SITE_ORIGIN || parsed.search || parsed.href !== value
    || !(validSlug(slug) || (breadcrumb && ['/', '/productos'].includes(parsed.pathname)))) fail(502);
  return parsed.href;
}
function links(value, max, breadcrumb = false) {
  if (!Array.isArray(value) || value.length > max) fail(502);
  return value.map(item => {
    object(item);
    return { name: text(item.name, 512), url: publicLink(item.url, breadcrumb) };
  });
}

export function validatePage(value, requestedSlug) {
  object(value);
  if (!['PRODUCT', 'CATEGORY'].includes(value.type) || !validSlug(value.slug)
    || value.slug !== requestedSlug) fail(502);
  const canonicalUrl = publicLink(value.canonicalUrl);
  if (canonicalUrl !== `${SITE_ORIGIN}/productos/${value.slug}`) fail(502);
  const breadcrumbs = links(value.breadcrumbs, 16, true);
  if (!breadcrumbs.length || breadcrumbs.at(-1).url !== canonicalUrl) fail(502);
  const pageLinks = links(value.links, 2000);
  if (value.type === 'PRODUCT' && pageLinks.length) fail(502);
  let image = null;
  if (value.image !== null) {
    object(value.image);
    const parsed = url(value.image.url);
    // Images are published by MIQA. Never accept local/private literal hosts or credentials.
    const host = parsed.hostname.toLowerCase();
    if (!host.includes('.') || host.endsWith('.localhost') || host.endsWith('.local')
      || /^[\d.]+$/.test(host) || host.includes(':') || parsed.port) fail(502);
    image = { url: parsed.href, altText: text(value.image.altText, 1024, true) };
  }
  // Copy only the public allowlist; extra administrative fields never reach the HTML.
  return {
    type: value.type, name: text(value.name, 512), slug: value.slug,
    seoTitle: text(value.seoTitle, 1024), seoDescription: text(value.seoDescription, 8192),
    bodyDescription: text(value.bodyDescription, 65_536, true),
    image, breadcrumbs, links: pageLinks, canonicalUrl,
  };
}

export function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
const CSS = `#miqa-catalog-seo{max-width:76rem;margin:1.5rem auto;padding:1.5rem;background:#faf8f5;color:#17212b;font:1rem/1.6 system-ui,sans-serif;overflow-wrap:anywhere}#miqa-catalog-seo h1{font-size:2rem;line-height:1.2;margin:1rem 0}#miqa-catalog-seo h2{font-size:1.4rem;margin:1.5rem 0 .5rem}#miqa-catalog-seo a{color:#174a75;text-decoration:underline}#miqa-catalog-seo a:focus-visible{outline:3px solid #174a75;outline-offset:4px}#miqa-catalog-seo ol,#miqa-catalog-seo ul{padding-left:1.5rem}#miqa-catalog-seo p{white-space:pre-wrap;margin:1rem 0}#miqa-catalog-seo img{display:block;max-width:100%;height:auto;margin:1rem 0}`;
function shell(page) {
  const breadcrumbs = page.breadcrumbs.map((item, index) => `<li>${index === page.breadcrumbs.length - 1
    ? `<span aria-current="page">${escapeHtml(item.name)}</span>`
    : `<a href="${escapeHtml(item.url)}">${escapeHtml(item.name)}</a>`}</li>`).join('');
  const image = page.image ? `<img src="${escapeHtml(page.image.url)}" alt="${escapeHtml(page.image.altText)}">` : '';
  const products = page.type === 'CATEGORY' && page.links.length
    ? `<section aria-labelledby="miqa-catalog-products"><h2 id="miqa-catalog-products">Productos</h2><ul>${page.links.map(item => `<li><a href="${escapeHtml(item.url)}">${escapeHtml(item.name)}</a></li>`).join('')}</ul></section>` : '';
  // Stage 3 owns the explicit handoff after fresh Angular data resolves. Do not hide prematurely.
  return `<main id="miqa-catalog-seo" data-miqa-catalog-seo data-miqa-canonical="${escapeHtml(page.canonicalUrl)}" aria-labelledby="miqa-catalog-title"><nav aria-label="Ruta de navegación"><ol>${breadcrumbs}</ol></nav><h1 id="miqa-catalog-title">${escapeHtml(page.name)}</h1>${image}<p>${escapeHtml(page.bodyDescription)}</p>${products}</main>`;
}
function metadata(page, robots) {
  const tag = (key, value, property = false) => `<meta ${property ? 'property' : 'name'}="${key}" content="${escapeHtml(value)}">`;
  const structured = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: page.breadcrumbs.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: item.url }))
  }).replace(/[<>&\u2028\u2029]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
  return `<title>${escapeHtml(page.seoTitle)}</title>${tag('description', page.seoDescription)}${tag('robots', robots)}<link rel="canonical" href="${escapeHtml(page.canonicalUrl)}">`
    + tag('og:title', page.seoTitle, true) + tag('og:description', page.seoDescription, true)
    + tag('og:url', page.canonicalUrl, true) + tag('og:type', page.type === 'PRODUCT' ? 'product' : 'website', true)
    + tag('og:site_name', 'MIQA', true) + tag('og:locale', 'es_PE', true)
    + tag('twitter:card', page.image ? 'summary_large_image' : 'summary')
    + tag('twitter:title', page.seoTitle) + tag('twitter:description', page.seoDescription)
    + (page.image ? tag('og:image', page.image.url, true) + tag('og:image:alt', page.image.altText, true)
      + tag('twitter:image', page.image.url) + tag('twitter:image:alt', page.image.altText) : '')
    + `<style data-miqa-catalog-style>${CSS}</style><script type="application/ld+json" data-miqa-seo-jsonld>${structured}</script>`;
}

export async function rewriteTemplate(template, page, { robots = 'index,follow' } = {}) {
  const counts = { html: 0, head: 0, body: 0, root: 0, base: 0, module: 0, doctype: 0 };
  const rewriter = new HTMLRewriter()
    .onDocument({ doctype() { counts.doctype++; } })
    .on('*', { element(element) {
      if (element.hasAttribute('ngh') || element.hasAttribute('ng-server-context')
        || element.hasAttribute('data-miqa-catalog-seo')) fail(500);
    } })
    .on('html', { element(element) { counts.html++; element.setAttribute('lang', 'es'); } })
    .on('head', { element(element) { counts.head++; element.append(metadata(page, robots), { html: true }); } })
    .on('body', { element(element) { counts.body++; element.prepend(shell(page), { html: true }); } })
    .on('base', { element(element) { counts.base++; if (element.getAttribute('href') !== '/') fail(500); } })
    .on('app-root', { element() { counts.root++; }, text(chunk) { if (chunk.text.trim()) fail(500); } })
    .on('app-root *', { element() { fail(500); } })
    .on('title', { element(element) { element.remove(); } })
    .on('meta', { element(element) {
      const key = (element.getAttribute('name') || element.getAttribute('property') || '').toLowerCase();
      if (['description', 'robots', 'googlebot', 'bingbot'].includes(key) || key.startsWith('og:') || key.startsWith('twitter:')) element.remove();
    } })
    .on('link', { element(element) {
      if ((element.getAttribute('rel') || '').toLowerCase().split(/\s+/).includes('canonical')) element.remove();
    } })
    .on('script', { element(element) {
      const type = (element.getAttribute('type') || '').trim().toLowerCase();
      const id = element.getAttribute('id') || '';
      if (id === 'ng-state' || id.endsWith('-state')) fail(500);
      if (type === 'application/ld+json') element.remove();
      if (type === 'module' && element.hasAttribute('src')) counts.module++;
    } });
  const html = await rewriter.transform(new Response(template, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })).text();
  if (['html', 'head', 'body', 'root', 'base', 'doctype'].some(key => counts[key] !== 1) || counts.module < 1) fail(500);
  return html;
}

async function readLimited(response, max) {
  const declared = response.headers.get('Content-Length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > max)) fail(502);
  if (!response.body) fail(502);
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0; let body = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > max) fail(502);
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
    if (!body.trim()) fail(502);
    return body;
  } finally { reader.cancel().catch(() => {}); }
}
function backendUrl(env, slug) {
  let base;
  try { base = new URL(env.SEO_PAGES_BACKEND_BASE_URL); } catch { fail(500); }
  if (!(base.protocol === 'https:' || (base.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)))
    || base.username || base.password || base.search || base.hash
    || !base.pathname.endsWith('/api/public/seo/pages')) fail(500);
  return `${base.href}/${slug}`;
}
function errorResponse(request, status) {
  const message = status === 404 ? 'Página no disponible.' : status === 405 ? 'Método no permitido.' : 'Página temporalmente no disponible. Inténtalo más tarde.';
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${message} | MIQA</title><meta name="robots" content="noindex,nofollow"></head><body><main><h1>${message}</h1><a href="${SITE_ORIGIN}/productos">Ver productos</a></main></body></html>`;
  return new Response(request.method === 'HEAD' ? null : html, { status, headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff',
    ...(status === 405 ? { Allow: 'GET, HEAD' } : {}),
  } });
}

export function createCatalogPages({ fetchImpl = globalThis.fetch, renderImpl = rewriteTemplate } = {}) {
  return { async fetch(request, env, slug = catalogSlug(request)) {
    if (slug === null) return env.ASSETS.fetch(request);
    if (!['GET', 'HEAD'].includes(request.method)) return errorResponse(request, 405);
    const incoming = new URL(request.url);
    if (incoming.pathname.endsWith('/')) {
      // Preserve drop-trailing-slash even for slugs created after the build.
      return new Response(null, { status: 307, headers: {
        Location: incoming.pathname.slice(0, -1) + incoming.search, 'Cache-Control': 'no-store',
      } });
    }
    const controller = new AbortController();
    let timedOut = false; let timer;
    const deadline = new Promise((_, reject) => { timer = setTimeout(() => {
      timedOut = true; controller.abort(); reject(new Error('Deadline exceeded'));
    }, CATALOG_TIMEOUT_MS); });
    const operation = async () => {
      const response = await fetchImpl(backendUrl(env, slug), {
        method: 'GET', headers: { Accept: 'application/json' }, redirect: 'manual',
        cache: 'no-store', signal: controller.signal,
      });
      if (response.status === 301) {
        const location = publicLink(response.headers.get('Location'));
        if (location === `${SITE_ORIGIN}/productos/${slug}`) fail(502);
        return new Response(null, { status: 301, headers: { Location: location, 'Cache-Control': 'no-store' } });
      }
      if (response.status !== 200) fail(response.status === 404 || response.status >= 500 ? response.status : 502);
      if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('Content-Type') || '')) fail(502);
      const raw = await readLimited(response, MAX_PAGE_BYTES);
      let data;
      try { data = JSON.parse(raw); } catch { fail(502); }
      const page = validatePage(data, slug);
      // HTML handling maps /index.csr to index.csr.html; /index.csr.html itself redirects.
      const template = await env.ASSETS.fetch(new Request(new URL('/index.csr', request.url), {
        method: 'GET', headers: { Accept: 'text/html' }, signal: controller.signal,
      }));
      if (template.status !== 200 || !/^text\/html(?:\s*;|$)/i.test(template.headers.get('Content-Type') || '')) fail(500);
      const html = await renderImpl(await readLimited(template, MAX_TEMPLATE_BYTES), page, {
        robots: page.type === 'CATEGORY' && incoming.search ? 'noindex,follow' : 'index,follow',
      });
      return new Response(request.method === 'HEAD' ? null : html, { headers: {
        'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      } });
    };
    try { return await Promise.race([operation(), deadline]); }
    catch (error) { return errorResponse(request, timedOut ? 504 : error.status || 502); }
    finally { clearTimeout(timer); controller.abort(); }
  } };
}
