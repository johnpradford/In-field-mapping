import type { FeatureCollection } from 'geojson';
import { kml, gpx } from '@tmcw/togeojson';
import shp, { combine, parseShp, parseDbf } from 'shpjs';
import { defaultLayerStyle, type Layer, type LayerGeometryType } from '@/models/Layer';

/**
 * Equivalent to FileImportService.swift.
 *
 * Reads a file (or several files that together make up one shapefile) and
 * turns the result into one or more Layer objects.
 *
 * Supported formats:
 *   - GeoJSON (.geojson, .json)             — 1 file → 1 Layer
 *   - GPX     (.gpx)                        — 1 file → 1 Layer
 *   - KML     (.kml)                        — 1 file → 1 Layer
 *   - Shapefile (.zip containing .shp etc.) — 1 zip  → 1 or more Layers
 *                                             (each .shp inside becomes its own Layer)
 *   - Raw shapefile components              — N files sharing a basename
 *                                             (e.g. bat_sites.shp + bat_sites.dbf
 *                                             + bat_sites.shx + bat_sites.prj)
 *                                             collectively → 1 Layer
 *
 * `importFile` always returns an array (even for single-Layer cases) so the
 * caller can treat all results uniformly. ImportScreen groups raw shapefile
 * components by basename before calling `importShapefileFromComponents`.
 */

export type ImportableExtension = 'geojson' | 'json' | 'gpx' | 'kml' | 'zip';

/** File extensions that belong to a multi-file shapefile group. */
export const SHAPEFILE_COMPONENT_EXTENSIONS = [
  'shp', 'dbf', 'shx', 'prj', 'cpg', 'qmd', 'sbn', 'sbx', 'fbn', 'fbx', 'ain', 'aih', 'ixs', 'mxs', 'atx', 'xml',
] as const;
export type ShapefileComponentExtension = typeof SHAPEFILE_COMPONENT_EXTENSIONS[number];

export function isShapefileComponentExt(ext: string): ext is ShapefileComponentExtension {
  return (SHAPEFILE_COMPONENT_EXTENSIONS as readonly string[]).includes(ext.toLowerCase());
}

/**
 * Parse one fully-formed file (GeoJSON / GPX / KML / zipped shapefile) into
 * one or more Layers. Raw shapefile components (.shp on its own etc.) are
 * NOT handled here — group them by basename in the caller and pass them to
 * `importShapefileFromComponents` instead.
 */
export async function importFile(
  filename: string,
  fileBytes: ArrayBuffer | string,
  projectId?: string,
): Promise<Layer[]> {
  const ext = guessExtension(filename);
  const baseName = stripExtension(filename);

  switch (ext) {
    case 'geojson':
    case 'json': {
      const text = typeof fileBytes === 'string'
        ? fileBytes
        : new TextDecoder().decode(fileBytes);
      const fc = JSON.parse(text) as FeatureCollection;
      return [makeLayer(baseName, filename, fc, projectId)];
    }
    case 'gpx': {
      const text = typeof fileBytes === 'string'
        ? fileBytes
        : new TextDecoder().decode(fileBytes);
      const dom = new DOMParser().parseFromString(text, 'text/xml');
      const fc = gpx(dom) as FeatureCollection;
      return [makeLayer(baseName, filename, fc, projectId)];
    }
    case 'kml': {
      const text = typeof fileBytes === 'string'
        ? fileBytes
        : new TextDecoder().decode(fileBytes);
      const dom = new DOMParser().parseFromString(text, 'text/xml');
      const fc = kml(dom) as FeatureCollection;
      return [makeLayer(baseName, filename, fc, projectId)];
    }
    case 'zip': {
      // Shapefile zip — shpjs returns either one FeatureCollection (single
      // .shp inside the zip) or an array (one entry per .shp inside).
      // We make ONE Layer per .shp so each gets its own colour/visibility.
      if (typeof fileBytes === 'string') {
        throw new Error('Shapefile zip must be supplied as binary data, not text');
      }
      const result = await shp(fileBytes);
      if (Array.isArray(result)) {
        return result.map((entry, i) => {
          const fcEntry = entry as FeatureCollection & { fileName?: string };
          const innerName = fcEntry.fileName ?? `${baseName}-${i + 1}`;
          return makeLayer(innerName, filename, fcEntry, projectId);
        });
      }
      return [makeLayer(baseName, filename, result as FeatureCollection, projectId)];
    }
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}

/**
 * Build one Layer from a group of raw shapefile components that share a
 * basename. The .shp + .dbf are required; the .prj (projection) and .cpg
 * (encoding hint) are optional but used when present.
 *
 * Throws a clear human-readable error if .shp or .dbf is missing.
 */
export async function importShapefileFromComponents(
  basename: string,
  components: { ext: string; bytes: ArrayBuffer }[],
  projectId?: string,
): Promise<Layer> {
  const byExt = new Map<string, ArrayBuffer>();
  for (const c of components) byExt.set(c.ext.toLowerCase(), c.bytes);

  const shpBuf = byExt.get('shp');
  const dbfBuf = byExt.get('dbf');
  if (!shpBuf) {
    throw new Error(
      `${basename}: missing .shp file — a shapefile needs at least .shp + .dbf + .shx`,
    );
  }
  if (!dbfBuf) {
    throw new Error(
      `${basename}: missing .dbf file — a shapefile needs at least .shp + .dbf + .shx`,
    );
  }

  const prjBuf = byExt.get('prj');
  const cpgBuf = byExt.get('cpg');

  // .prj → string for parseShp's projection handling.
  const prjString = prjBuf ? new TextDecoder().decode(prjBuf) : undefined;

  const parsedShp = parseShp(shpBuf, prjString);
  // parseDbf's typings expect a ShpJSBuffer for the encoding hint;
  // pass the .cpg ArrayBuffer when present, otherwise an empty buffer
  // (shpjs falls back to its default encoding when no hint is given).
  const parsedDbf = parseDbf(dbfBuf, cpgBuf ?? new ArrayBuffer(0));
  const fc = combine([parsedShp, parsedDbf]) as FeatureCollection;

  return makeLayer(basename, `${basename}.shp`, fc, projectId);
}

/* ---------------- internal helpers ---------------- */

function makeLayer(
  name: string,
  sourceFilename: string,
  fc: FeatureCollection,
  projectId?: string,
): Layer {
  return {
    id: crypto.randomUUID(),
    name,
    sourceFilename,
    geometryType: inferGeometryType(fc),
    visible: true,
    zIndex: 0,
    style: defaultLayerStyle(),
    data: fc,
    projectId,
  };
}

function guessExtension(filename: string): ImportableExtension {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (['geojson', 'json', 'gpx', 'kml', 'zip'].includes(ext)) {
    return ext as ImportableExtension;
  }
  throw new Error(`Unrecognised file extension: ${filename}`);
}

export function stripExtension(filename: string): string {
  return filename.replace(/\.[^./]+$/, '');
}

function inferGeometryType(fc: FeatureCollection): LayerGeometryType {
  const types = new Set<string>();
  for (const f of fc.features) {
    if (!f.geometry) continue;
    const t = f.geometry.type;
    if (t === 'Point' || t === 'MultiPoint') types.add('point');
    else if (t === 'LineString' || t === 'MultiLineString') types.add('line');
    else if (t === 'Polygon' || t === 'MultiPolygon') types.add('polygon');
  }
  if (types.size === 1) return [...types][0] as LayerGeometryType;
  if (types.size === 0) return 'point';
  return 'mixed';
}
