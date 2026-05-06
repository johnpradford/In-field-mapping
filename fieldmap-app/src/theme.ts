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

/** Default tile source for the offline map.
 *  Update this once the base-map source decision is finalised. */
export const DEFAULT_MAP_STYLE_URL =
  'https://demotiles.maplibre.org/style.json';

/** Default starting position — Newman, WA (Pilbara). */
export const DEFAULT_MAP_CENTER: [number, number] = [119.7333, -23.355];
export const DEFAULT_MAP_ZOOM = 9;
