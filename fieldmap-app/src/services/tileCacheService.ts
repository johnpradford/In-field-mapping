import maplibregl from 'maplibre-gl';

/**
 * Map tile cache — backs MapLibre tile requests with the browser
 * Cache API so a basemap that was loaded online remains visible
 * after the device goes offline.
 *
 * Opt in per tile source by prefixing the URL template with `cached://`,
 * e.g. `cached://https://server.../{z}/{y}/{x}`. MapLibre routes those
 * requests through the protocol handler registered below, which checks
 * the cache before falling back to the network.
 *
 * Idempotency:
 *   - Storage uses the Cache API, which is URL-keyed: repeated `put`
 *     calls for the same tile overwrite a single entry rather than
 *     accumulating duplicates.
 *   - Concurrent requests for the same URL share one underlying fetch
 *     via an in-flight map, so a burst of MapLibre tile requests
 *     during pan/zoom produces at most one network call per tile.
 *   - `registerCachedTileProtocol` no-ops on subsequent calls, so it's
 *     safe to invoke from module-init, React effects, or both.
 */

const CACHE_NAME = 'fieldmap-tiles-v1';
const PROTOCOL = 'cached';
const SCHEME_PREFIX = `${PROTOCOL}://`;

type TileBytes = { data: ArrayBuffer; contentType: string };

const inflight = new Map<string, Promise<TileBytes>>();
let protocolRegistered = false;

async function openTileCache(): Promise<Cache | null> {
  // `caches` is undefined outside secure contexts (e.g. http://) and on
  // some very old WebViews. Falling back to network-only here keeps the
  // map usable even when persistent tile storage is unavailable.
  if (typeof caches === 'undefined') return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch (err) {
    console.warn('[Fieldmap] tile cache open failed:', err);
    return null;
  }
}

async function fetchAndStore(realUrl: string): Promise<TileBytes> {
  const res = await fetch(realUrl);
  if (!res.ok) {
    throw new Error(
      `tile fetch failed (${res.status} ${res.statusText}): ${realUrl}`,
    );
  }
  // Clone before consuming — reading the body twice would otherwise throw.
  const forCache = res.clone();
  const data = await res.arrayBuffer();
  const contentType =
    res.headers.get('content-type') ?? 'application/octet-stream';

  // Best-effort write; quota / write failures must not delay the render.
  void openTileCache().then((cache) => {
    if (!cache) return;
    cache.put(realUrl, forCache).catch((err) => {
      console.warn('[Fieldmap] tile cache write failed:', realUrl, err);
    });
  });

  return { data, contentType };
}

async function loadTile(realUrl: string): Promise<TileBytes> {
  const cache = await openTileCache();
  if (cache) {
    const hit = await cache.match(realUrl);
    if (hit) {
      const data = await hit.arrayBuffer();
      const contentType =
        hit.headers.get('content-type') ?? 'application/octet-stream';
      return { data, contentType };
    }
  }
  return fetchAndStore(realUrl);
}

/**
 * Fetch a tile, returning its bytes either from the on-device cache
 * or from the network (writing the result back into the cache).
 * Concurrent calls for the same URL share a single underlying fetch.
 */
export async function fetchTileWithCache(realUrl: string): Promise<TileBytes> {
  const existing = inflight.get(realUrl);
  if (existing) return existing;

  const promise = loadTile(realUrl);
  inflight.set(realUrl, promise);
  promise
    .catch(() => {
      // Swallow here — callers see the rejection via their own await.
      // This `catch` exists only so the `finally` below runs cleanly.
    })
    .finally(() => {
      if (inflight.get(realUrl) === promise) inflight.delete(realUrl);
    });
  return promise;
}

/**
 * Register the `cached://` protocol with MapLibre. Idempotent —
 * subsequent calls are no-ops, so it's safe to invoke from module
 * load and React effects alike.
 */
export function registerCachedTileProtocol(): void {
  if (protocolRegistered) return;
  protocolRegistered = true;
  maplibregl.addProtocol(PROTOCOL, async (params) => {
    const realUrl = params.url.startsWith(SCHEME_PREFIX)
      ? params.url.slice(SCHEME_PREFIX.length)
      : params.url;
    const { data } = await fetchTileWithCache(realUrl);
    return { data };
  });
}

/** Drop every cached tile. Safe to call when no cache exists. */
export async function clearTileCache(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    await caches.delete(CACHE_NAME);
  } catch (err) {
    console.warn('[Fieldmap] tile cache clear failed:', err);
  }
}
