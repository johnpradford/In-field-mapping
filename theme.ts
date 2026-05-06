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
} as const;

/* ---------------- Map / tiles configuration ---------------- */

/**
 * URL of a PMTiles archive holding the basemap.
 *
 * For development this points at the Protomaps public-hosted demo file
 * which streams a worldwide basemap. **For real field use** this MUST
 * be swapped to a file bundled with the app (or downloaded onto the
 * device) so the map works offline — see README "Offline base map tiles".
 *
 * Replace with one of:
 *   - 'pmtiles://https://example.com/your-region.pmtiles'  (self-hosted)
 *   - 'pmtiles:///offline/wa-pilbara.pmtiles'              (bundled)
 */
export const PMTILES_URL =
  'pmtiles://https://demo-bucket.protomaps.com/v4.pmtiles';

/** Style JSON used by MapLibre. Defined inline so we don't need a separate
 *  hosted style.json — the source is wired to PMTILES_URL above.
 *
 *  This style uses the Protomaps "light" basemap style. To customise the
 *  look, edit the `paint` properties below or import a full style JSON. */
export const MAP_STYLE = {
  version: 8 as const,
  glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
  sources: {
    protomaps: {
      type: 'vector' as const,
      url: PMTILES_URL,
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> · <a href="https://protomaps.com">Protomaps</a>',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#E4EAEA' } },
    {
      id: 'earth',
      type: 'fill',
      source: 'protomaps',
      'source-layer': 'earth',
      paint: { 'fill-color': '#F4F1E8' },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'protomaps',
      'source-layer': 'water',
      paint: { 'fill-color': '#B8D4E3' },
    },
    {
      id: 'roads',
      type: 'line',
      source: 'protomaps',
      'source-layer': 'roads',
      paint: { 'line-color': '#9AAFAF', 'line-width': 1 },
    },
    {
      id: 'roads_major',
      type: 'line',
      source: 'protomaps',
      'source-layer': 'roads',
      filter: ['in', 'kind', 'highway', 'major_road'],
      paint: { 'line-color': '#577A7A', 'line-width': 2 },
    },
    {
      id: 'places',
      type: 'symbol',
      source: 'protomaps',
      'source-layer': 'places',
      filter: ['in', 'kind', 'locality'],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11,
      },
      paint: { 'text-color': '#1C4A50', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1.2 },
    },
  ],
} as const;

/** Default starting position — Newman, WA (Pilbara). */
export const DEFAULT_MAP_CENTER: [number, number] = [119.7333, -23.355];
export const DEFAULT_MAP_ZOOM = 9;
