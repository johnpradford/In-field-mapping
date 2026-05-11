import { useEffect, useRef, useState } from 'react';
import maplibregl, { Map as MapLibreMapInstance, GeoJSONSource } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import {
  MAP_STYLE,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from '@/theme';
import { useAppStore } from '@/store/appStore';
import type { Layer } from '@/models/Layer';
import type { Pin } from '@/models/Pin';

/**
 * MapLibre GL JS wrapper. Equivalent to MapLibreView.swift.
 *
 * Renders the basemap (from a PMTiles archive — works offline once the
 * archive is bundled or downloaded), the user's GPS dot, dropped pins,
 * and any imported layers. All interaction (taps to drop a pin, etc.)
 * is piped back into the Zustand store.
 *
 * Offline: edit `PMTILES_URL` in src/theme.ts to point at a bundled
 * .pmtiles file instead of the public demo URL. See README
 * "Offline base map tiles" for the full instructions.
 */

// Register the pmtiles:// protocol once at module load so MapLibre can
// fetch tiles from a PMTiles archive via fetch / file: / etc.
const pmtilesProtocol = new Protocol();
maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile);

export default function MapLibreMap({
  onMapReady,
  onBearingChange,
}: {
  onMapReady?: (map: MapLibreMapInstance) => void;
  onBearingChange?: (bearing: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMapInstance | null>(null);

  // True once the map's style has loaded and our sources/layers exist.
  // Bug fix: previously the pin / layer sync effects bailed out when
  // `isStyleLoaded()` was false (which is the case on first render),
  // and never re-ran once the style finished loading. That meant pins
  // and imported layers added before the style was ready never showed
  // up. We now flip this state to true inside the `load` callback,
  // which causes every dependent effect to re-run with the latest data
  // from the Zustand store.
  const [mapReady, setMapReady] = useState(false);

  const pins = useAppStore((s) => s.pins);
  const layers = useAppStore((s) => s.layers);
  const activeTool = useAppStore((s) => s.activeTool);
  const addMeasurePoint = useAppStore((s) => s.addMeasurePoint);
  const measurePoints = useAppStore((s) => s.measurePoints);
  const addPin = useAppStore((s) => s.addPin);
  const nextPinNumber = useAppStore((s) => s.nextPinNumber);
  const activeProject = useAppStore((s) => s.activeProject);

  // ----- Initialise map once -----
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      // The cast is required because MAP_STYLE is `as const` but MapLibre
      // expects a mutable StyleSpecification object.
      style: MAP_STYLE as unknown as maplibregl.StyleSpecification,
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'top-right');

    // Scale bar in the bottom-left of the map. Useful in the field for
    // judging distances at a glance without using the Measure tool.
    map.addControl(
      new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }),
      'bottom-left',
    );

    // Show user location (web GeolocateControl — replaced by Capacitor watch on device)
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
    );

    map.on('rotate', () => {
      onBearingChange?.(map.getBearing());
    });

    map.on('load', () => {
      // Empty pin source + layer
      map.addSource('pins', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'pins-circles',
        type: 'circle',
        source: 'pins',
        paint: {
          'circle-radius': 8,
          'circle-color': '#E87D2F',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });
      map.addLayer({
        id: 'pins-labels',
        type: 'symbol',
        source: 'pins',
        layout: {
          'text-field': ['to-string', ['get', 'number']],
          'text-size': 12,
          'text-offset': [0, -1.4],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#1C4A50',
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 1.5,
        },
      });

      // Empty measure source + layers (line, per-point dots, per-segment labels)
      map.addSource('measure', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'measure-line',
        type: 'line',
        source: 'measure',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 3,
          'line-dasharray': [2, 1],
        },
      });
      map.addLayer({
        id: 'measure-points',
        type: 'circle',
        source: 'measure',
        // Tapped points only — exclude the per-segment label points
        filter: ['all',
          ['==', ['geometry-type'], 'Point'],
          ['!=', ['get', 'kind'], 'segmentLabel'],
        ],
        paint: {
          'circle-radius': 6,
          'circle-color': '#FFFFFF',
          'circle-stroke-color': '#1C4A50',
          'circle-stroke-width': 2,
        },
      });
      // Per-segment distance labels — e.g. "47 m"
      map.addLayer({
        id: 'measure-segment-labels',
        type: 'symbol',
        source: 'measure',
        filter: ['==', ['get', 'kind'], 'segmentLabel'],
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 12,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-padding': 2,
        },
        paint: {
          'text-color': '#1C4A50',
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2,
        },
      });

      setMapReady(true);
      onMapReady?.(map);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Sync pins -----
  // Re-runs whenever pins change OR when the map first becomes ready,
  // so pins added before style-load still show up.
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource('pins') as GeoJSONSource | undefined;
    src?.setData(pinsToGeoJson(pins));
  }, [pins, mapReady]);

  // ----- Sync imported layers -----
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    syncImportedLayers(map, layers);
  }, [layers, mapReady]);

  // ----- Sync measure points -----
  // Always render every tapped point as a circle, plus a connecting line
  // once there are 2+ points. Showing the first tapped point gives the
  // operator immediate visual confirmation that the click registered.
  // Per-segment distance labels are also added.
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource('measure') as GeoJSONSource | undefined;
    if (!src) return;

    const features: GeoJSON.Feature[] = measurePoints.map((m, i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: m.coordinate },
      properties: { idx: i, kind: 'measurePoint' },
    }));
    if (measurePoints.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: measurePoints.map((m) => m.coordinate),
        },
        properties: { kind: 'measureLine' },
      });
      // Add a midpoint Point per segment with a distance label
      for (let i = 1; i < measurePoints.length; i++) {
        const a = measurePoints[i - 1].coordinate;
        const b = measurePoints[i].coordinate;
        const meters = haversineMetres(a, b);
        const label = meters < 1000
          ? `${Math.round(meters)} m`
          : `${(meters / 1000).toFixed(2)} km`;
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
          },
          properties: { kind: 'segmentLabel', label, segmentIdx: i - 1 },
        });
      }
    }
    src.setData({ type: 'FeatureCollection', features });
  }, [measurePoints, mapReady]);

  // ----- Map tap handling depending on active tool -----
  // Measure tool: each tap appends a new measure point.
  // Pin tool:     each tap drops a pin at the tapped coordinate (tap-to-place).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function onClick(e: maplibregl.MapMouseEvent) {
      const coord: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      if (activeTool === 'measure') {
        addMeasurePoint({ coordinate: coord });
        return;
      }
      if (activeTool === 'pin') {
        addPin({
          id: crypto.randomUUID(),
          number: nextPinNumber,
          coordinate: coord,
          // No GPS fix here — this is a tap-placed pin. accuracy is required
          // by the Pin interface so we record 0 to indicate "not from GPS".
          accuracy: 0,
          timestamp: new Date().toISOString(),
          note: '',
          projectId: activeProject?.id,
        });
        // Pin mode stays active so the operator can drop several in a
        // row. They tap the Pin button again to exit.
      }
    }

    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
    };
  }, [activeTool, addMeasurePoint, addPin, nextPinNumber, activeProject]);

  // ----- Cursor feedback for drawing tools -----
  // Without this the cursor stays as the pan-hand and the operator
  // can't tell that tap-to-place is enabled.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas();
    if (activeTool === 'measure' || activeTool === 'pin') {
      canvas.style.cursor = 'crosshair';
    } else {
      canvas.style.cursor = '';
    }
  }, [activeTool]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

function pinsToGeoJson(pins: Pin[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pins.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: p.coordinate },
      properties: { id: p.id, number: p.number, note: p.note },
    })),
  };
}

/** Haversine distance in metres between two [lng,lat] coordinates. */
function haversineMetres(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Add/remove/update sources + paint layers so the map matches the store. */
function syncImportedLayers(map: MapLibreMapInstance, layers: Layer[]) {
  const desiredIds = new Set(layers.map((l) => `imported-${l.id}`));

  // Remove layers/sources we no longer need
  const allLayers = map.getStyle()?.layers ?? [];
  for (const ml of allLayers) {
    if (ml.id.startsWith('imported-') && !desiredIds.has(ml.id.replace(/-fill|-line|-circle/, ''))) {
      if (map.getLayer(ml.id)) map.removeLayer(ml.id);
    }
  }
  for (const sourceId of Object.keys(map.getStyle()?.sources ?? {})) {
    if (sourceId.startsWith('imported-') && !desiredIds.has(sourceId)) {
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    }
  }

  // Add or update each layer
  for (const layer of layers) {
    const sourceId = `imported-${layer.id}`;
    const existing = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (existing) {
      existing.setData(layer.data);
    } else {
      map.addSource(sourceId, { type: 'geojson', data: layer.data });
    }

    // Visibility-aware paint layers, one per geometry type the layer might contain
    const visibility = layer.visible ? 'visible' : 'none';

    if (!map.getLayer(`${sourceId}-fill`)) {
      map.addLayer({
        id: `${sourceId}-fill`,
        type: 'fill',
        source: sourceId,
        filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
        paint: { 'fill-color': layer.style.color, 'fill-opacity': layer.style.fillOpacity },
        layout: { visibility },
      });
    } else {
      map.setLayoutProperty(`${sourceId}-fill`, 'visibility', visibility);
      map.setPaintProperty(`${sourceId}-fill`, 'fill-color', layer.style.color);
      map.setPaintProperty(`${sourceId}-fill`, 'fill-opacity', layer.style.fillOpacity);
    }

    if (!map.getLayer(`${sourceId}-line`)) {
      map.addLayer({
        id: `${sourceId}-line`,
        type: 'line',
        source: sourceId,
        filter: ['!=', ['geometry-type'], 'Point'],
        paint: { 'line-color': layer.style.color, 'line-width': layer.style.lineWidth },
        layout: { visibility },
      });
    } else {
      map.setLayoutProperty(`${sourceId}-line`, 'visibility', visibility);
      map.setPaintProperty(`${sourceId}-line`, 'line-color', layer.style.color);
      map.setPaintProperty(`${sourceId}-line`, 'line-width', layer.style.lineWidth);
    }

    if (!map.getLayer(`${sourceId}-circle`)) {
      map.addLayer({
        id: `${sourceId}-circle`,
        type: 'circle',
        source: sourceId,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-color': layer.style.color,
          'circle-radius': 5,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#FFFFFF',
        },
        layout: { visibility },
      });
    } else {
      map.setLayoutProperty(`${sourceId}-circle`, 'visibility', visibility);
      map.setPaintProperty(`${sourceId}-circle`, 'circle-color', layer.style.color);
    }
  }
}
