import type { FeatureCollection } from 'geojson';

/** What kind of features a layer holds. */
export type LayerGeometryType = 'point' | 'line' | 'polygon' | 'mixed';

/** Symbol shape for point layers — picked from a small fixed set so the
 *  user can distinguish layers by both colour AND shape (handy when
 *  printed in greyscale or for colour-blind readers). */
export type PointShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'cross';

/** Fill pattern for polygon layers — solid plus 5 hatching variants. */
export type FillPattern =
  | 'solid'
  | 'hatch-left'   // diagonal lines, top-left to bottom-right
  | 'hatch-right'  // diagonal lines, top-right to bottom-left
  | 'horizontal'
  | 'vertical'
  | 'dots';

/** Style applied to a layer when drawn on the map. */
export interface LayerStyle {
  /** Hex colour, e.g. "#E87D2F". */
  color: string;
  /** Optional outline colour — applied around point symbols and along
   *  polygon edges. When undefined, no outline is drawn (points render
   *  as solid fill, polygon outlines use `color`). */
  outlineColor?: string;
  /** Line width in px (used for line + polygon outline). */
  lineWidth: number;
  /** Fill opacity 0–1 (polygons only). */
  fillOpacity: number;
  /** Symbol shape — only used by point layers. Defaults to circle. */
  pointShape?: PointShape;
  /** Fill pattern — only used by polygon layers. Defaults to solid. */
  fillPattern?: FillPattern;
  /** Whether feature labels are drawn on the map. For points, the label
   *  sits next to the symbol. For polygons, it sits as a subtle
   *  watermark in the polygon's interior. Defaults to false. Label
   *  text is always black with a white halo. */
  showLabels?: boolean;
}

/** An imported spatial layer. Mirrors Layer.swift. */
export interface Layer {
  id: string;
  name: string;
  /** Original filename, e.g. "drainage.geojson". */
  sourceFilename: string;
  geometryType: LayerGeometryType;
  /** Whether the layer is currently visible on the map. */
  visible: boolean;
  /** Drawing order — higher = on top. */
  zIndex: number;
  style: LayerStyle;
  /** GeoJSON data for the layer. */
  data: FeatureCollection;
  projectId?: string;
}

/** A sensible default style for new layers. */
export const defaultLayerStyle = (): LayerStyle => ({
  color: '#E87D2F',
  lineWidth: 2,
  fillOpacity: 0.3,
  pointShape: 'circle',
  fillPattern: 'solid',
  showLabels: false,
});

/** All available point shapes, in display order. */
export const POINT_SHAPES: PointShape[] = [
  'circle', 'square', 'triangle', 'diamond', 'star', 'cross',
];

/** All available fill patterns, in display order. */
export const FILL_PATTERNS: FillPattern[] = [
  'solid', 'hatch-left', 'hatch-right', 'horizontal', 'vertical', 'dots',
];

/** Human-readable label for a point shape (for accessibility / UI). */
export function pointShapeLabel(shape: PointShape): string {
  switch (shape) {
    case 'circle': return 'Circle';
    case 'square': return 'Square';
    case 'triangle': return 'Triangle';
    case 'diamond': return 'Diamond';
    case 'star': return 'Star';
    case 'cross': return 'Cross';
  }
}

/** Human-readable label for a fill pattern. */
export function fillPatternLabel(pattern: FillPattern): string {
  switch (pattern) {
    case 'solid': return 'Solid';
    case 'hatch-left': return 'Hatch (left)';
    case 'hatch-right': return 'Hatch (right)';
    case 'horizontal': return 'Horizontal lines';
    case 'vertical': return 'Vertical lines';
    case 'dots': return 'Dots';
  }
}
