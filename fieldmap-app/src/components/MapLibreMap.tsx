import { useEffect, useRef } from 'react';
import maplibregl, { Map as MapLibreMapInstance, GeoJSONSource } from 'maplibre-gl';
import {
  DEFAULT_MAP_STYLE_URL,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from '@/theme';
import { useAppStore } from '@/store/appStore';
import type { Layer } from '@/models/Layer';
import type { Pin } from '@/models/Pin';

/**
 * MapLibre GL JS wrapper. Equivalent to MapLibreView.swift.
 *
 * Renders the basemap, the user's GPS dot, dropped pins, and any
 * imported layers. All interaction (taps to drop a pin, etc.) is
 * piped back into the Zustand store.
 *
 * NOTE: For real-world use, replace DEFAULT_MAP_STYLE_URL in
 * src/theme.ts with an offline tile source (Protomaps PMTiles file
 * stored on-device, or self-hosted MBTiles).
 */
export default function MapLibreMap({
  onMapReady,
}: {
  onMapReady?: (map: MapLibreMapInstance) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMapInstance | null>(null);

  const pins = useAppStore((s) => s.pins);
  const layers = useAppStore((s) => s.layers);
  const activeTool = useAppStore((s) => s.activeTool);
  const addMeasurePoint = useAppStore((s) => s.addMeasurePoint);
  const measurePoints = useAppStore((s) => s.measurePoints);

  // ----- Initialise map once -----
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DEFAULT_MAP_STYLE_URL,
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'top-right');

    // Show user location (web GeolocateControl — replaced by Capacitor watch on device)
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
    );

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

      // Empty measure source + layer
      map.addSource('measure', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'measure-line',
        type: 'line',
        source: 'measure',
        paint: { 'line-color': '#E6007E', 'line-width': 3, 'line-dasharray': [2, 1] },
      });

      onMapReady?.(map);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Sync pins -----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource('pins') as GeoJSONSource | undefined;
    src?.setData(pinsToGeoJson(pins));
  }, [pins]);

  // ----- Sync imported layers -----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    syncImportedLayers(map, layers);
  }, [layers]);

  // ----- Sync measure points -----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource('measure') as GeoJSONSource | undefined;
    if (!src) return;
    if (measurePoints.length < 2) {
      src.setData({ type: 'FeatureCollection', features: [] });
      return;
    }
    src.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: measurePoints.map((m) => m.coordinate),
          },
          properties: {},
        },
      ],
    });
  }, [measurePoints]);

  // ----- Map tap handling depending on active tool -----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function onClick(e: maplibregl.MapMouseEvent) {
      const coord: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      if (activeTool === 'measure') {
        addMeasurePoint({ coordinate: coord });
      }
      // The Pin tool uses the GPS location, not a tapped coordinate —
      // see MapScreen for the Pin handler. Tapping while pin tool is
      // active is intentionally a no-op.
    }

    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
    };
  }, [activeTool, addMeasurePoint]);

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
