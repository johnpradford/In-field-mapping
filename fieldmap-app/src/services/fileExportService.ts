import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { Pin } from '@/models/Pin';
import type { Track } from '@/models/Track';
import type { Layer } from '@/models/Layer';
import type { Project } from '@/models/Project';
import { FIELDMAP_FILE_VERSION, type FieldmapFile } from '@/models/FieldmapFile';
import type { FeatureCollection, Feature } from 'geojson';

/**
 * Equivalent to FileExportService.swift.
 *
 * Saves a file into the app's data directory, then opens the native
 * share sheet so the user can email it / drop it in Files / etc.
 */

export type ExportFormat = 'fieldmap' | 'geojson' | 'gpx';

export async function exportProject(
  project: Project,
  pins: Pin[],
  tracks: Track[],
  layers: Layer[],
  format: ExportFormat,
): Promise<void> {
  let filename: string;
  let contents: string;

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
      break;
    }
    case 'geojson': {
      filename = `${slug(project.name)}.geojson`;
      contents = JSON.stringify(buildGeoJson(pins, tracks, layers), null, 2);
      break;
    }
    case 'gpx': {
      filename = `${slug(project.name)}.gpx`;
      contents = buildGpx(project, pins, tracks);
      break;
    }
  }

  // Write to the app's documents directory
  const written = await Filesystem.writeFile({
    path: filename,
    data: contents,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
  });

  // Open the share sheet
  await Share.share({
    title: project.name,
    url: written.uri,
    dialogTitle: 'Export project',
  });
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
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: pin.coordinate },
      properties: {
        type: 'pin',
        number: pin.number,
        accuracy: pin.accuracy,
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
        coordinates: t.points.map((p) => p.coordinate),
      },
      properties: {
        type: 'track',
        name: t.name,
        startTime: t.startTime,
        endTime: t.endTime,
        totalDistance: t.totalDistance,
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

function buildGpx(project: Project, pins: Pin[], tracks: Track[]): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const wpts = pins
    .map(
      (p) => `  <wpt lat="${p.coordinate[1]}" lon="${p.coordinate[0]}">
    <name>Pin ${p.number}</name>
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
    (pt) => `      <trkpt lat="${pt.coordinate[1]}" lon="${pt.coordinate[0]}"><time>${pt.timestamp}</time></trkpt>`,
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
