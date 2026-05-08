/**
 * Biologic Environmental brand palette.
 * Mirrored in tailwind.config.js — keep them in sync.
 */
export const colors = {
  tealDark: '#1C4A50',
  tealMid: '#577A7A',
  tealLight: '#9AAFAF',
  sage: '#C7D3D3',
  greyLight: '#E4EAEA',
  olive: '#AFA96E',
  accent: '#E87D2F', // orange — primary action highlight
  pink: '#E6007E',
  lavender: '#9B8EC4',
  skyBlue: '#B8D4E3',
  /** Recording indicator — clean safety red, distinct from the brand
   *  pink (which is used for destructive confirmations). */
  recordingRed: '#D32F2F',
  /* ---------- High-visibility palette ----------
   * Designed to make symbols pop on satellite imagery and stand out
   * against the brand colours when several layers overlap. Pick one
   * for fill or outline whenever a brand colour blends in too much. */
  brightCyan: '#00D7FF',
  royalBlue: '#0057FF',
  hotMagenta: '#FF2DA3',
  limeGreen: '#7DFF3A',
  brightOrange: '#FF7A00',
  white: '#FFFFFF',
} as const;

/* ---------------- Map / tiles configuration ---------------- */

/**
 * URL of a PMTiles archive holding an offline vector basemap.
 *
 * Used by the optional vector "topographic" style (kept here for reference
 * and future swap). Currently the live basemap is satellite imagery — see
 * MAP_STYLE below.
 *
 * Replace with one of:
 *   - 'pmtiles://https://example.com/your-region.pmtiles'  (self-hosted)
 *   - 'pmtiles:///offline/wa-pilbara.pmtiles'              (bundled)
 */
export const PMTILES_URL =
  'pmtiles://https://demo-bucket.protomaps.com/v4.pmtiles';

/**
 * Satellite imagery tile URL.
 *
 * Esri's free World_Imagery REST tile service — fine for prototyping and
 * fieldwork visibility checks. For shipped offline use, swap to a bundled
 * raster PMTiles or MBTiles archive of the relevant region (see README
 * "Offline base map tiles").
 */
export const SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

/** Style JSON used by MapLibre — satellite raster basemap.
 *
 *  Single raster source (Esri World Imagery) plus a thin labels overlay so
 *  the operator can still see place names. For offline operation, swap the
 *  satellite source to a bundled file:// or pmtiles:// URL.
 */
export const MAP_STYLE = {
  version: 8 as const,
  glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
  sources: {
    satellite: {
      type: 'raster' as const,
      tiles: [SATELLITE_TILE_URL],
      tileSize: 256,
      attribution:
        'Imagery © <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics, and the GIS community',
      maxzoom: 19,
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#0a0e10' } },
    { id: 'satellite', type: 'raster', source: 'satellite' },
  ],
} as const;

/** Default starting position — Newman, WA (Pilbara). */
export const DEFAULT_MAP_CENTER: [number, number] = [119.7333, -23.355];
export const DEFAULT_MAP_ZOOM = 9;
