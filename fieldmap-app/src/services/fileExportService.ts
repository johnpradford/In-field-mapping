import type { Pin } from '@/models/Pin';
import type { Track } from '@/models/Track';
import type { Layer } from '@/models/Layer';
import type { Project } from '@/models/Project';
import { FIELDMAP_FILE_VERSION, type FieldmapFile } from '@/models/FieldmapFile';
import type { FeatureCollection, Feature } from 'geojson';

/**
 * Browser-based export service for the PWA.
 *
 * Strategy:
 *   - Build the file contents as a string in memory.
 *   - If the browser supports the Web Share API with files (Chrome/Edge
 *     on Android, Safari on iOS 15+), open the native share sheet so
 *     the user can email it / drop it in Files. This is the closest
 *     equivalent to the Capacitor Share behaviour from the native build.
 *   - Otherwise fall back to a regular download — the file lands in the
 *     browser's Downloads folder and the user can move it from there.
 *
 * No Capacitor APIs are used here. Both export paths work in any modern
 * mobile browser; the native shells get their own (better) integration
 * when we add them back later.
 */

/**
 * Trigger a download (or share sheet) for `contents` as `filename`.
 *
 * Shared by both `exportProject` and `shareFeatureCollection` below so
 * the user-visible behaviour is identical for both flows.
 */
async function deliverFile(
  filename: string,
  contents: string,
  mimeType: string,
  shareTitle: string,
): Promise<void> {
  const blob = new Blob([contents], { type: mimeType });

  // Try the Web Share API first. It needs File support (canShare with a
  // File object) — feature-detect both pieces before attempting.
  // navigator.canShare is async-safe; this whole branch is skipped on
  // unsupported browsers.
  try {
    const file = new File([blob], filename, { type: mimeType });
    // Some browsers (older Safari, desktop Firefox) implement navigator.share
    // but not canShare with files. Guard against both.
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({ files: [file], title: shareTitle, text: shareTitle });
      return;
    }
  } catch (err) {
    // User cancelled the share sheet, or share failed — fall through to
    // the plain download path so we still deliver the file somehow.
    // eslint-disable-next-line no-console
    console.warn('[Fieldmap] Web Share failed, falling back to download:', err);
  }

  // Plain download fallback — works in every browser.
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  // Some browsers require the anchor to be in the DOM to honour `download`.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick to make sure the click has consumed the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ExportFormat = 'fieldmap' | 'geojson' | 'gpx';

/** Format the user can pick when sharing pins or features inline from
 *  the Layers / Pins detail screens. */
export type ShareFormat = 'geojson' | 'gpx' | 'kml';

export async function exportProject(
  project: Project,
  pins: Pin[],
  tracks: Track[],
  layers: Layer[],
  format: ExportFormat,
): Promise<void> {
  let filename: string;
  let contents: string;
  let mimeType: string;

  switch (format) {
    case 'fieldmap': {
      const file: FieldmapFile = {
        version: FIELDMAP_FILE_VERSION,
        exportedAt: new Date().toISOString(),
        exportedBy: 'Fieldmap 0.1.0',
        project,
        pins,
        tracks,
        layers,
      };
      filename = `${slug(project.name)}.fieldmap`;
      contents = JSON.stringify(file, null, 2);
      mimeType = 'application/json';
      break;
    }
    case 'geojson': {
      filename = `${slug(project.name)}.geojson`;
      contents = JSON.stringify(buildGeoJson(pins, tracks, layers), null, 2);
      mimeType = 'application/geo+json';
      break;
    }
    case 'gpx': {
      filename = `${slug(project.name)}.gpx`;
      contents = buildGpx(project, pins, tracks);
      mimeType = 'application/gpx+xml';
      break;
    }
  }

  await deliverFile(filename, contents, mimeType, project.name);
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'project';
}

function buildGeoJson(pins: Pin[], tracks: Track[], layers: Layer[]): FeatureCollection {
  const features: Feature[] = [];

  for (const pin of pins) {
    // GeoJSON supports 3D coordinates as [lng, lat, alt] — include
    // altitude as the third element when present so the data round-
    // trips into GIS tools that read 3D points.
    const coords: number[] =
      pin.altitude !== undefined && Number.isFinite(pin.altitude)
        ? [pin.coordinate[0], pin.coordinate[1], pin.altitude]
        : [pin.coordinate[0], pin.coordinate[1]];
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: coords },
      properties: {
        type: 'pin',
        number: pin.number,
        name: pin.name,
        accuracy: pin.accuracy,
        altitude: pin.altitude,
        timestamp: pin.timestamp,
        note: pin.note,
      },
    });
  }
  for (const t of tracks) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        // 3D coordinates per point — altitude as the third element
        // when present, otherwise the standard 2D pair.
        coordinates: t.points.map((p) =>
          p.altitude !== undefined && Number.isFinite(p.altitude)
            ? [p.coordinate[0], p.coordinate[1], p.altitude]
            : [p.coordinate[0], p.coordinate[1]],
        ),
      },
      properties: {
        type: 'track',
        name: t.name,
        startTime: t.startTime,
        endTime: t.endTime,
        totalDistance: t.totalDistance,
        minAltitude: t.minAltitude,
        maxAltitude: t.maxAltitude,
        elevationGain: t.elevationGain,
      },
    });
  }
  for (const l of layers) {
    for (const f of l.data.features) {
      features.push({
        ...f,
        properties: { ...(f.properties ?? {}), layerName: l.name },
      });
    }
  }

  return { type: 'FeatureCollection', features };
}

/* ------------------------------------------------------------------ */
/* Subset share — used by the Pins layer detail and the Layer feature  */
/* list to share a selected handful of features without building a     */
/* whole project file. The user picks the format at the call site.     */
/* ------------------------------------------------------------------ */

/** Share a selection of features in the chosen format. The features
 *  argument is what's already filtered down to the user's current
 *  selection — this function doesn't re-filter. */
export async function shareFeatureCollection(
  baseFilename: string,
  features: Feature[],
  format: ShareFormat,
  shareTitle: string = 'Fieldmap export',
): Promise<void> {
  let filename: string;
  let contents: string;
  let mimeType: string;

  switch (format) {
    case 'geojson': {
      filename = `${slug(baseFilename)}.geojson`;
      const fc: FeatureCollection = { type: 'FeatureCollection', features };
      contents = JSON.stringify(fc, null, 2);
      mimeType = 'application/geo+json';
      break;
    }
    case 'gpx': {
      filename = `${slug(baseFilename)}.gpx`;
      contents = buildGpxFromFeatures(shareTitle, features);
      mimeType = 'application/gpx+xml';
      break;
    }
    case 'kml': {
      filename = `${slug(baseFilename)}.kml`;
      contents = buildKmlFromFeatures(shareTitle, features);
      mimeType = 'application/vnd.google-earth.kml+xml';
      break;
    }
  }

  await deliverFile(filename, contents, mimeType, shareTitle);
}

/** Build a minimal GPX from a list of GeoJSON features. Points become
 *  waypoints, LineStrings become tracks. Polygons are skipped (GPX
 *  doesn't have a polygon concept). */
function buildGpxFromFeatures(title: string, features: Feature[]): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const wpts: string[] = [];
  const trks: string[] = [];

  // <ele> helper — emit only when the coord triple has an altitude.
  const ele = (alt: number | undefined) =>
    alt !== undefined && Number.isFinite(alt) ? `<ele>${alt}</ele>` : '';

  for (const f of features) {
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const name = String(props.name ?? props.Name ?? props.NAME ?? props.title ?? '');
    // Pin altitude can live in properties.altitude (Fieldmap-emitted
    // pins) or as the optional 3rd coordinate (other GeoJSON sources).
    const propsAlt =
      typeof props.altitude === 'number' && Number.isFinite(props.altitude)
        ? (props.altitude as number)
        : undefined;
    if (!f.geometry) continue;
    if (f.geometry.type === 'Point') {
      const c = f.geometry.coordinates as number[];
      const lng = c[0];
      const lat = c[1];
      const alt = propsAlt ?? (c.length >= 3 ? c[2] : undefined);
      const desc = props.note ?? props.description ?? '';
      wpts.push(
        `  <wpt lat="${lat}" lon="${lng}">` +
          (name ? `\n    <name>${escape(name)}</name>` : '') +
          (alt !== undefined ? `\n    ${ele(alt)}` : '') +
          (desc ? `\n    <desc>${escape(String(desc))}</desc>` : '') +
          `\n  </wpt>`,
      );
    } else if (f.geometry.type === 'LineString') {
      const coords = f.geometry.coordinates as number[][];
      const segs = coords
        .map((c) => {
          const lng = c[0];
          const lat = c[1];
          const alt = c.length >= 3 ? c[2] : undefined;
          return `      <trkpt lat="${lat}" lon="${lng}">${ele(alt)}</trkpt>`;
        })
        .join('\n');
      trks.push(
        `  <trk>${name ? `\n    <name>${escape(name)}</name>` : ''}\n    <trkseg>\n${segs}\n    </trkseg>\n  </trk>`,
      );
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Fieldmap" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${escape(title)}</name></metadata>
${wpts.join('\n')}
${trks.join('\n')}
</gpx>`;
}

/** Build a minimal KML from a list of GeoJSON features. Each feature
 *  becomes a Placemark with the appropriate geometry. */
function buildKmlFromFeatures(title: string, features: Feature[]): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function coordsString(coords: number[][]): string {
    return coords.map((c) => `${c[0]},${c[1]}${c[2] !== undefined ? ',' + c[2] : ''}`).join(' ');
  }

  function geometryToKml(geom: GeoJSON.Geometry): string {
    switch (geom.type) {
      case 'Point':
        return `<Point><coordinates>${(geom.coordinates as number[]).join(',')}</coordinates></Point>`;
      case 'LineString':
        return `<LineString><coordinates>${coordsString(geom.coordinates as number[][])}</coordinates></LineString>`;
      case 'Polygon': {
        const rings = (geom.coordinates as number[][][]).map(
          (ring) =>
            `<LinearRing><coordinates>${coordsString(ring)}</coordinates></LinearRing>`,
        );
        const outer = rings[0] ? `<outerBoundaryIs>${rings[0]}</outerBoundaryIs>` : '';
        const inners = rings
          .slice(1)
          .map((r) => `<innerBoundaryIs>${r}</innerBoundaryIs>`)
          .join('');
        return `<Polygon>${outer}${inners}</Polygon>`;
      }
      case 'MultiPoint':
      case 'MultiLineString':
      case 'MultiPolygon': {
        // Wrap each part in its own Placemark-equivalent geometry.
        // Simplest: emit a MultiGeometry with each child converted.
        const partType =
          geom.type === 'MultiPoint'
            ? 'Point'
            : geom.type === 'MultiLineString'
            ? 'LineString'
            : 'Polygon';
        const children = (geom.coordinates as unknown[]).map((c) =>
          geometryToKml({ type: partType, coordinates: c } as GeoJSON.Geometry),
        );
        return `<MultiGeometry>${children.join('')}</MultiGeometry>`;
      }
      default:
        return '';
    }
  }

  const placemarks = features
    .filter((f) => f.geometry)
    .map((f) => {
      const props = (f.properties ?? {}) as Record<string, unknown>;
      const name = String(props.name ?? props.Name ?? props.NAME ?? props.title ?? 'Feature');
      const desc = props.note ?? props.description ?? '';
      const descXml = desc ? `<description>${escape(String(desc))}</description>` : '';
      return `    <Placemark><name>${escape(name)}</name>${descXml}${geometryToKml(f.geometry!)}</Placemark>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escape(title)}</name>
${placemarks}
  </Document>
</kml>`;
}

function buildGpx(project: Project, pins: Pin[], tracks: Track[]): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const ele = (a?: number) =>
    a !== undefined && Number.isFinite(a) ? `<ele>${a}</ele>` : '';

  const wpts = pins
    .map(
      (p) => `  <wpt lat="${p.coordinate[1]}" lon="${p.coordinate[0]}">
    <name>${escape(p.name && p.name.trim().length > 0 ? p.name : `Pin ${p.number}`)}</name>
    ${ele(p.altitude)}
    ${p.note ? `<desc>${escape(p.note)}</desc>` : ''}
    <time>${p.timestamp}</time>
  </wpt>`,
    )
    .join('\n');

  const trks = tracks
    .map(
      (t) => `  <trk>
    <name>${escape(t.name)}</name>
    <trkseg>
${t.points
  .map(
    (pt) =>
      `      <trkpt lat="${pt.coordinate[1]}" lon="${pt.coordinate[0]}">${ele(pt.altitude)}<time>${pt.timestamp}</time></trkpt>`,
  )
  .join('\n')}
    </trkseg>
  </trk>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Fieldmap" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${escape(project.name)}</name></metadata>
${wpts}
${trks}
</gpx>`;
}
