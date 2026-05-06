import type { FeatureCollection } from 'geojson';

/** What kind of features a layer holds. */
export type LayerGeometryType = 'point' | 'line' | 'polygon' | 'mixed';

/** Style applied to a layer when drawn on the map. */
export interface LayerStyle {
  /** Hex colour, e.g. "#E87D2F". */
  color: string;
  /** Line width in px (used for line + polygon outline). */
  lineWidth: number;
  /** Fill opacity 0–1 (polygons only). */
  fillOpacity: number;
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
});
