import type { FeatureCollection } from 'geojson';
import { kml, gpx } from '@tmcw/togeojson';
import shp from 'shpjs';
import { defaultLayerStyle, type Layer, type LayerGeometryType } from '@/models/Layer';

/**
 * Equivalent to FileImportService.swift.
 *
 * Reads a file the user picked and turns it into a Layer object that
 * can be added to the active project.
 *
 * Supported formats:
 *   - GeoJSON (.geojson, .json)
 *   - GPX     (.gpx)
 *   - KML     (.kml)
 *   - Shapefile (.zip containing .shp + .dbf + .shx + optional .prj)
 */

export type ImportableExtension = 'geojson' | 'json' | 'gpx' | 'kml' | 'zip';

export async function importFile(
  filename: string,
  fileBytes: ArrayBuffer | string,
  projectId?: string,
): Promise<Layer> {
  const ext = guessExtension(filename);
  let geojson: FeatureCollection;

  switch (ext) {
    case 'geojson':
    case 'json': {
      const text = typeof fileBytes === 'string' ? fileBytes : new TextDecoder().decode(fileBytes);
      geojson = JSON.parse(text);
      break;
    }
    case 'gpx': {
      const text = typeof fileBytes === 'string' ? fileBytes : new TextDecoder().decode(fileBytes);
      const dom = new DOMParser().parseFromString(text, 'text/xml');
      geojson = gpx(dom) as FeatureCollection;
      break;
    }
    case 'kml': {
      const text = typeof fileBytes === 'string' ? fileBytes : new TextDecoder().decode(fileBytes);
      const dom = new DOMParser().parseFromString(text, 'text/xml');
      geojson = kml(dom) as FeatureCollection;
      break;
    }
    case 'zip': {
      // Shapefile zip — shpjs handles the .shp/.dbf/.shx parsing.
      if (typeof fileBytes === 'string') {
        throw new Error('Shapefile must be supplied as binary data, not text');
      }
      const result = await shp(fileBytes);
      geojson = Array.isArray(result)
        ? { type: 'FeatureCollection', features: result.flatMap((r) => r.features) }
        : (result as FeatureCollection);
      break;
    }
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }

  const geometryType = inferGeometryType(geojson);

  return {
    id: crypto.randomUUID(),
    name: stripExtension(filename),
    sourceFilename: filename,
    geometryType,
    visible: true,
    zIndex: 0,
    style: defaultLayerStyle(),
    data: geojson,
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

function stripExtension(filename: string): string {
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
