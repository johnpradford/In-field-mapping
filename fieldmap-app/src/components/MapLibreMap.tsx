import { useEffect, useRef } from 'react';
import maplibregl, { Map as MapLibreMapInstance, GeoJSONSource } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import {
  MAP_STYLE,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from '@/theme';
import { useAppStore } from '@/store/appStore';
import { getCurrentLocation } from '@/services/locationService';
import { registerCachedTileProtocol } from '@/services/tileCacheService';
import type { Layer, PointShape, FillPattern } from '@/models/Layer';
import type { Pin } from '@/models/Pin';
import type { Project } from '@/models/Project';
import type { MeasurePoint } from '@/store/appStore';

/**
 * MapLibre GL JS wrapper. Equivalent to MapLibreView.swift.
 *
 * Renders the basemap (Esri satellite for now), the user's GPS dot,
 * dropped pins, and any imported layers. All interaction (taps to drop
 * a pin, etc.) is piped back into the Zustand store.
 *
 * IMPORTANT: This component does its initial data sync directly inside
 * the map's `load` callback (using `useAppStore.getState()`), and again
 * via React effects when the data changes. The "do it inside `load`"
 * step is what guarantees pins / imported layers / measure points show
 * up on first paint regardless of React StrictMode double-mounting or
 * effect ordering.
 */

// Register the pmtiles:// protocol once at module load so MapLibre can
// fetch tiles from a PMTiles archive via fetch / file: / etc.
const pmtilesProtocol = new Protocol();
maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile);

// Register cached:// so raster tile sources flagged with that scheme
// are served from / written into the Cache API. Idempotent.
registerCachedTileProtocol();

/** Default pin colour — brand lavender. Edit per-pin colour is a future feature. */
const PIN_COLOUR = '#9B8EC4';

/**
 * Draw a teardrop pin into a 48x64 canvas and return the ImageData.
 *
 * The shape: round head + tapered point ending at the bottom-centre.
 * White inner circle gives a clean spot for the number text rendered
 * by the symbol layer to sit on top of. We render at 2x physical size
 * and pass `pixelRatio: 2` to addImage so the icon stays sharp on
 * retina screens.
 */
function createPinIconImageData(colour: string): ImageData {
  // 24x32 logical pixels at 2x = 48x64 physical pixels.
  const W = 48;
  const H = 64;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2); // logical 24x32 coordinate space

  // Pin body (teardrop)
  const body = new Path2D(
    'M12,1 C5.4,1 0.5,6.4 0.5,12 C0.5,21 12,31.5 12,31.5 C12,31.5 23.5,21 23.5,12 C23.5,6.4 18.6,1 12,1 Z',
  );
  ctx.fillStyle = colour;
  ctx.fill(body);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke(body);

  // Inner white circle where the number will sit
  ctx.beginPath();
  ctx.arc(12, 11, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  return ctx.getImageData(0, 0, W, H);
}

export default function MapLibreMap({
  onMapReady,
  onBearingChange,
}: {
  onMapReady?: (map: MapLibreMapInstance) => void;
  onBearingChange?: (bearing: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMapInstance | null>(null);
  // True once our custom sources / layers have been added.
  const sourcesReadyRef = useRef(false);

  const pins = useAppStore((s) => s.pins);
  const layers = useAppStore((s) => s.layers);
  const projects = useAppStore((s) => s.projects);
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

    // De-cluttered control layout (so the north arrow has the top-right to itself):
    //   - Attribution → bottom-right (compact "i")
    //   - Scale bar   → bottom-left
    //   - GPS button  → top-left
    //   - North arrow → top-right (rendered as a separate React component, not a MapLibre control)
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right',
    );
    map.addControl(
      new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }),
      'bottom-left',
    );
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'top-left',
    );

    map.on('rotate', () => {
      onBearingChange?.(map.getBearing());
    });

    map.on('load', () => {
      // Defensive: bail if a StrictMode double-mount has already
      // replaced this map with a newer one.
      if (mapRef.current !== map) return;

      // ----- Sources + layers for our overlays (pins / measure / imported) -----
      addOverlaySourcesAndLayers(map);
      sourcesReadyRef.current = true;

      // ----- Initial sync from the current Zustand store state -----
      // This is critical: we read state imperatively here so the very
      // first paint contains any pins / measure points / imported
      // layers the user already had — without depending on React
      // effects re-running at exactly the right moment.
      const state = useAppStore.getState();
      setPinSourceData(map, state.pins, state.projects);
      setMeasureSourceData(map, state.measurePoints);
      syncImportedLayers(map, state.layers, state.projects);

      // Helpful log so John can confirm in DevTools that load fired and
      // the initial data was applied.
      // eslint-disable-next-line no-console
      console.log('[Fieldmap] map loaded — initial sync applied:', {
        pins: state.pins.length,
        measurePoints: state.measurePoints.length,
        layers: state.layers.length,
      });

      onMapReady?.(map);
    });

    mapRef.current = map;
    return () => {
      sourcesReadyRef.current = false;
      map.remove();
      if (mapRef.current === map) mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Sync pins on subsequent changes -----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sourcesReadyRef.current) return;
    setPinSourceData(map, pins, projects);
  }, [pins, projects]);

  // ----- Sync imported layers on subsequent changes -----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sourcesReadyRef.current) return;
    syncImportedLayers(map, layers, projects);
  }, [layers, projects]);

  // ----- Sync measure points on subsequent changes -----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sourcesReadyRef.current) return;
    setMeasureSourceData(map, measurePoints);
  }, [measurePoints]);

  // ----- Map tap handling depending on active tool -----
  // Tap on an existing pin: open the PinInfoPanel for that pin (regardless
  // of which tool is active — tapping a pin is always editing).
  // Otherwise:
  //   Measure tool: each tap appends a new measure point.
  //   Pin tool:     each tap drops a NEW pin at the tapped coordinate.
  //   No tool:      do nothing (default pan/zoom behaviour preserved).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Capture into a local that's narrowed to non-null inside the
    // closure below — TypeScript loses the outer narrowing across
    // function declarations, so we re-assert with a typed local.
    const mapLocal: MapLibreMapInstance = map;

    function onClick(e: maplibregl.MapMouseEvent) {
      // Did the click hit an existing pin? `pins-circles` is large enough
      // (9 px radius) that a finger tap will register on it reliably.
      let hitPin: { id: string } | null = null;
      if (mapLocal.getLayer('pins-circles')) {
        const features = mapLocal.queryRenderedFeatures(e.point, {
          layers: ['pins-circles'],
        });
        if (features.length > 0) {
          const props = features[0].properties as { id?: string } | null;
          if (props?.id) hitPin = { id: props.id };
        }
      }
      if (hitPin) {
        const state = useAppStore.getState();
        const pin = state.pins.find((p) => p.id === hitPin!.id);
        if (pin) {
          state.selectPin(pin);
          return;
        }
      }

      const coord: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      if (activeTool === 'measure') {
        addMeasurePoint({ coordinate: coord });
        return;
      }
      if (activeTool === 'pin') {
        const newPinId = crypto.randomUUID();
        addPin({
          id: newPinId,
          number: nextPinNumber,
          coordinate: coord,
          // The pin is dropped at the tapped location, so accuracy is
          // not the GPS-fix accuracy of that point — we record 0 here
          // and try to back-fill altitude + the operator's GPS accuracy
          // below from a fresh fix. Altitude represents the operator's
          // elevation at the moment of the observation.
          accuracy: 0,
          timestamp: new Date().toISOString(),
          note: '',
          projectId: activeProject?.id,
        });
        // Fire-and-forget GPS fetch to back-fill altitude metadata.
        // Failures are non-fatal — the pin keeps its tap-location and
        // simply has no altitude recorded.
        void getCurrentLocation()
          .then((loc) => {
            const patch: Partial<Pin> = {};
            if (loc.altitude !== undefined && Number.isFinite(loc.altitude)) {
              patch.altitude = loc.altitude;
            }
            if (loc.accuracy !== undefined && Number.isFinite(loc.accuracy)) {
              patch.accuracy = loc.accuracy;
            }
            if (Object.keys(patch).length > 0) {
              useAppStore.getState().updatePin(newPinId, patch);
            }
          })
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.warn('[Fieldmap] could not back-fill pin altitude:', err);
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

/* ------------------------------------------------------------------ */
/* Source / layer setup + sync helpers                                  */
/* ------------------------------------------------------------------ */

/**
 * Add all the GeoJSON sources and paint layers we draw on top of the basemap.
 *
 * NOTE for the recurring "layers don't render" bug: we keep the measure
 * tool's three visual concerns (line, tapped points, segment labels) in
 * three SEPARATE sources rather than one source filtered three ways.
 * Filter expressions like `['geometry-type']` and `['get', 'kind']`
 * appeared to be silently rejected in MapLibre v4 in some cases — moving
 * each visual to its own source eliminates that whole class of failure
 * and makes addLayer trivially correct. The diagnostics in the
 * try/catch wrapper below also surface any silent failure to the
 * Console with the [Fieldmap] prefix.
 */
function addOverlaySourcesAndLayers(map: MapLibreMapInstance) {
  const tryAddSource = (id: string, src: maplibregl.SourceSpecification) => {
    if (map.getSource(id)) return;
    try {
      map.addSource(id, src);
      // eslint-disable-next-line no-console
      console.log('[Fieldmap] addSource ok:', id);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Fieldmap] addSource FAILED:', id, err);
    }
  };
  const tryAddLayer = (layer: maplibregl.LayerSpecification) => {
    if (map.getLayer(layer.id)) return;
    try {
      map.addLayer(layer);
      // eslint-disable-next-line no-console
      console.log('[Fieldmap] addLayer ok:', layer.id);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Fieldmap] addLayer FAILED:', layer.id, err);
    }
  };

  const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

  // ----- Pins -----
  // 1) Register the teardrop pin icon (idempotent — skip if already there).
  if (!map.hasImage('fieldmap-pin')) {
    try {
      map.addImage('fieldmap-pin', createPinIconImageData(PIN_COLOUR), { pixelRatio: 2 });
      // eslint-disable-next-line no-console
      console.log('[Fieldmap] pin icon registered');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Fieldmap] pin icon registration FAILED:', err);
    }
  }

  tryAddSource('pins', { type: 'geojson', data: empty });

  // 2) The icon layer — places the teardrop image at each pin coordinate,
  //    anchored at the pin's tip so the geographic location is correct.
  //    For the IDs we keep "pins-circles" so the syncImportedLayers
  //    `before` reference (which puts imported layers BENEATH our pin
  //    layers) keeps working unchanged.
  tryAddLayer({
    id: 'pins-circles',
    type: 'symbol',
    source: 'pins',
    layout: {
      'icon-image': 'fieldmap-pin',
      'icon-anchor': 'bottom',
      'icon-size': 1,
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  });

  // 3) Pin number, drawn inside the white spot on the pin's head.
  //    text-offset is in ems; the pin's head centre sits ~21 px above
  //    the geographic location, so for 11 px text that's about -1.9 em.
  tryAddLayer({
    id: 'pins-labels',
    type: 'symbol',
    source: 'pins',
    layout: {
      'text-field': ['to-string', ['get', 'number']],
      // The protomaps glyphs server ships the Noto Sans family; without
      // an explicit text-font MapLibre asks for "Open Sans Regular"
      // which 404s and labels silently fail to render.
      'text-font': ['Noto Sans Regular'],
      'text-size': 11,
      'text-anchor': 'center',
      'text-offset': [0, -1.9],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': '#1C4A50',
      'text-halo-color': '#FFFFFF',
      'text-halo-width': 1.2,
    },
  });

  // 4) Pin NAME — rendered just below the pin tip, only when a name is
  //    set. Filters on `has 'name'` so unnamed pins stay clean.
  tryAddLayer({
    id: 'pins-name-labels',
    type: 'symbol',
    source: 'pins',
    filter: ['has', 'name'],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 12,
      'text-anchor': 'top',
      'text-offset': [0, 0.4],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
      'text-max-width': 10,
    },
    paint: {
      'text-color': '#1C4A50',
      'text-halo-color': '#FFFFFF',
      'text-halo-width': 1.6,
    },
  });

  // ----- Measure: dashed connecting line (LineString features only) -----
  tryAddSource('measure-line', { type: 'geojson', data: empty });
  tryAddLayer({
    id: 'measure-line',
    type: 'line',
    source: 'measure-line',
    paint: {
      'line-color': '#FFFFFF',
      'line-width': 3,
      'line-dasharray': [2, 1],
    },
  });

  // ----- Measure: tapped points (Point features) -----
  tryAddSource('measure-points', { type: 'geojson', data: empty });
  tryAddLayer({
    id: 'measure-points',
    type: 'circle',
    source: 'measure-points',
    paint: {
      'circle-radius': 6,
      'circle-color': '#FFFFFF',
      'circle-stroke-color': '#1C4A50',
      'circle-stroke-width': 2,
    },
  });

  // ----- Measure: per-segment distance labels (Point features at midpoints) -----
  tryAddSource('measure-labels', { type: 'geojson', data: empty });
  tryAddLayer({
    id: 'measure-segment-labels',
    type: 'symbol',
    source: 'measure-labels',
    layout: {
      'text-field': ['get', 'label'],
      // Same reason as pins-labels: we have to specify a font the
      // protomaps glyphs server actually serves, otherwise MapLibre asks
      // for "Open Sans Regular" which 404s and the text never renders.
      'text-font': ['Noto Sans Regular'],
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
}

/** True if the pin or layer should currently render on the map. Honours
 *  the parent project's visibility flag — undefined or true = visible,
 *  false = hidden. Items with no projectId (unfiled) are always
 *  considered visible at the project level. */
function isProjectVisible(projectId: string | undefined, projects: Project[]): boolean {
  if (!projectId) return true;
  const proj = projects.find((p) => p.id === projectId);
  return proj?.visible !== false;
}

function pinsToGeoJson(pins: Pin[], projects: Project[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pins
      // Drop pins whose project is hidden — keeps the source data clean
      // so labels and the click hit-test honour project visibility too.
      .filter((p) => isProjectVisible(p.projectId, projects))
      .map((p) => {
        // Only include `name` in properties when it's actually set, so the
        // pins-name-labels filter (`['has', 'name']`) cleanly separates
        // named vs. unnamed pins.
        const props: Record<string, unknown> = {
          id: p.id,
          number: p.number,
          note: p.note,
        };
        if (p.name && p.name.trim().length > 0) props.name = p.name;
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: p.coordinate },
          properties: props,
        };
      }),
  };
}

function setPinSourceData(
  map: MapLibreMapInstance,
  pins: Pin[],
  projects: Project[],
) {
  const src = map.getSource('pins') as GeoJSONSource | undefined;
  if (!src) {
    // eslint-disable-next-line no-console
    console.warn('[Fieldmap] setPinSourceData: pins source missing');
    return;
  }
  const data = pinsToGeoJson(pins, projects);
  src.setData(data);
  // eslint-disable-next-line no-console
  console.log('[Fieldmap] pins source updated:', data.features.length, 'features');
}

function setMeasureSourceData(
  map: MapLibreMapInstance,
  measurePoints: MeasurePoint[],
) {
  const linesSrc = map.getSource('measure-line') as GeoJSONSource | undefined;
  const pointsSrc = map.getSource('measure-points') as GeoJSONSource | undefined;
  const labelsSrc = map.getSource('measure-labels') as GeoJSONSource | undefined;
  if (!linesSrc || !pointsSrc || !labelsSrc) {
    // eslint-disable-next-line no-console
    console.warn('[Fieldmap] setMeasureSourceData: a measure source is missing', {
      linesSrc: !!linesSrc,
      pointsSrc: !!pointsSrc,
      labelsSrc: !!labelsSrc,
    });
    return;
  }

  // Tapped points
  const pointFeatures: GeoJSON.Feature[] = measurePoints.map((m, i) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: m.coordinate },
    properties: { idx: i },
  }));
  pointsSrc.setData({ type: 'FeatureCollection', features: pointFeatures });

  // Connecting line + per-segment midpoint labels (only when 2+ points)
  const lineFeatures: GeoJSON.Feature[] = [];
  const labelFeatures: GeoJSON.Feature[] = [];
  if (measurePoints.length >= 2) {
    lineFeatures.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: measurePoints.map((m) => m.coordinate),
      },
      properties: {},
    });
    for (let i = 1; i < measurePoints.length; i++) {
      const a = measurePoints[i - 1].coordinate;
      const b = measurePoints[i].coordinate;
      const meters = haversineMetres(a, b);
      const label = meters < 1000
        ? `${Math.round(meters)} m`
        : `${(meters / 1000).toFixed(2)} km`;
      labelFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
        },
        properties: { label, segmentIdx: i - 1 },
      });
    }
  }
  linesSrc.setData({ type: 'FeatureCollection', features: lineFeatures });
  labelsSrc.setData({ type: 'FeatureCollection', features: labelFeatures });

  // eslint-disable-next-line no-console
  console.log('[Fieldmap] measure sources updated:', {
    points: pointFeatures.length,
    lines: lineFeatures.length,
    labels: labelFeatures.length,
  });
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

/**
 * Add/remove/update sources + paint layers so the map matches the store.
 *
 * Imported layers are inserted with `before: 'pins-circles'`, which puts
 * them BENEATH our pin layers in the render stack. Without this an
 * imported polygon's fill (or even a circle layer) can completely hide
 * dropped pins, and the user reports "pins aren't appearing" while the
 * source actually has data — because the pin is rendered, then painted
 * over by the next layer above.
 */
function syncImportedLayers(
  map: MapLibreMapInstance,
  layers: Layer[],
  projects: Project[],
) {
  const desiredIds = new Set(layers.map((l) => `imported-${l.id}`));

  // Remove layers/sources we no longer need
  const allLayers = map.getStyle()?.layers ?? [];
  for (const ml of allLayers) {
    if (
      ml.id.startsWith('imported-') &&
      !desiredIds.has(
        ml.id.replace(/-fill|-line|-circle|-point-label|-polygon-label/, ''),
      )
    ) {
      if (map.getLayer(ml.id)) map.removeLayer(ml.id);
    }
  }
  for (const sourceId of Object.keys(map.getStyle()?.sources ?? {})) {
    if (sourceId.startsWith('imported-') && !desiredIds.has(sourceId)) {
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    }
  }
  // Remove any per-layer point / pattern images for layers we've dropped.
  const liveLayerIds = new Set(layers.map((l) => l.id));
  for (const imgId of map.listImages()) {
    if (
      (imgId.startsWith('point-') || imgId.startsWith('pattern-')) &&
      !liveLayerIds.has(imgId.slice(imgId.indexOf('-') + 1))
    ) {
      try { map.removeImage(imgId); } catch { /* non-fatal */ }
    }
  }

  // We want imported layers to render BENEATH the user's pins / measure
  // overlays. addLayer's optional `before` parameter inserts the new
  // layer immediately below the named existing layer in the render
  // stack. 'pins-circles' is the lowest of our overlay layers, so
  // inserting before it puts imported below ALL overlays.
  const beforeId = map.getLayer('pins-circles') ? 'pins-circles' : undefined;

  // Add or update each layer
  for (const layer of layers) {
    const sourceId = `imported-${layer.id}`;
    const existing = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (existing) {
      existing.setData(layer.data);
    } else {
      map.addSource(sourceId, { type: 'geojson', data: layer.data });
    }

    // Effective visibility = layer's own toggle AND project visibility.
    // Hiding a project hides every layer underneath it without disturbing
    // the per-layer toggles (turning the project back on restores them).
    const projectVisible = isProjectVisible(layer.projectId, projects);
    const visibility = layer.visible && projectVisible ? 'visible' : 'none';

    // ----- Polygon fill -----
    // For solid fills we use fill-color + fill-opacity (cheap + sharp).
    // For hatch / dot patterns we generate a coloured pattern image
    // tinted with the layer's colour and use fill-pattern instead.
    const fillPattern: FillPattern = layer.style.fillPattern ?? 'solid';
    const patternImageId = `pattern-${layer.id}`;
    if (fillPattern !== 'solid') {
      const img = createFillPatternImageData(fillPattern, layer.style.color);
      if (map.hasImage(patternImageId)) {
        map.updateImage(patternImageId, img);
      } else {
        try {
          map.addImage(patternImageId, img, { pixelRatio: 2 });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[Fieldmap] addImage pattern FAILED:', patternImageId, err);
        }
      }
    } else if (map.hasImage(patternImageId)) {
      // Pattern was previously set but the user switched back to solid —
      // free up the image so we don't leak.
      map.removeImage(patternImageId);
    }

    if (!map.getLayer(`${sourceId}-fill`)) {
      map.addLayer(
        {
          id: `${sourceId}-fill`,
          type: 'fill',
          source: sourceId,
          filter: ['any',
            ['==', ['geometry-type'], 'Polygon'],
            ['==', ['geometry-type'], 'MultiPolygon'],
          ],
          paint:
            fillPattern === 'solid'
              ? {
                  'fill-color': layer.style.color,
                  'fill-opacity': layer.style.fillOpacity,
                }
              : {
                  'fill-pattern': patternImageId,
                  'fill-opacity': Math.max(0.6, layer.style.fillOpacity),
                },
          layout: { visibility },
        },
        beforeId,
      );
    } else {
      map.setLayoutProperty(`${sourceId}-fill`, 'visibility', visibility);
      if (fillPattern === 'solid') {
        // Switching back to a colour fill — clear the pattern first.
        map.setPaintProperty(`${sourceId}-fill`, 'fill-pattern', null);
        map.setPaintProperty(`${sourceId}-fill`, 'fill-color', layer.style.color);
        map.setPaintProperty(`${sourceId}-fill`, 'fill-opacity', layer.style.fillOpacity);
      } else {
        map.setPaintProperty(`${sourceId}-fill`, 'fill-pattern', patternImageId);
        map.setPaintProperty(
          `${sourceId}-fill`,
          'fill-opacity',
          Math.max(0.6, layer.style.fillOpacity),
        );
      }
    }

    // Line layer covers polygon outlines AND standalone LineStrings.
    // When the user picks an outline colour, polygon outlines pick it
    // up too — that's the whole point of the option. For pure line
    // layers, leaving outlineColor unset keeps the original behaviour.
    const lineColor = layer.style.outlineColor ?? layer.style.color;
    if (!map.getLayer(`${sourceId}-line`)) {
      map.addLayer(
        {
          id: `${sourceId}-line`,
          type: 'line',
          source: sourceId,
          filter: ['!=', ['geometry-type'], 'Point'],
          paint: {
            'line-color': lineColor,
            'line-width': layer.style.lineWidth,
          },
          layout: { visibility },
        },
        beforeId,
      );
    } else {
      map.setLayoutProperty(`${sourceId}-line`, 'visibility', visibility);
      map.setPaintProperty(`${sourceId}-line`, 'line-color', lineColor);
      map.setPaintProperty(`${sourceId}-line`, 'line-width', layer.style.lineWidth);
    }

    // ----- Point symbol -----
    // Each layer gets its own canvas-generated, coloured icon based on
    // the chosen shape. We use a non-SDF image (already tinted) so we
    // don't need MapLibre's icon-color paint expression. The layer
    // re-registers the image whenever shape or colour changes.
    const pointShape: PointShape = layer.style.pointShape ?? 'circle';
    const pointImageId = `point-${layer.id}`;
    const pointImg = createPointShapeImageData(
      pointShape,
      layer.style.color,
      layer.style.outlineColor,
    );
    if (map.hasImage(pointImageId)) {
      map.updateImage(pointImageId, pointImg);
    } else {
      try {
        map.addImage(pointImageId, pointImg, { pixelRatio: 2 });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[Fieldmap] addImage point FAILED:', pointImageId, err);
      }
    }

    // Replace the older circle layer with a symbol layer so non-circle
    // shapes can be drawn. We keep the suffix "-circle" to avoid
    // breaking the `before` reference and any old debugging that
    // searched for it. (Yes, naming is now slightly misleading; better
    // than churning the layer ids.)
    if (map.getLayer(`${sourceId}-circle`)) {
      const existing = map.getLayer(`${sourceId}-circle`);
      // If the existing layer is a circle (from before the symbol
      // upgrade), remove and re-add as a symbol.
      if (existing && existing.type === 'circle') {
        map.removeLayer(`${sourceId}-circle`);
      }
    }
    if (!map.getLayer(`${sourceId}-circle`)) {
      map.addLayer(
        {
          id: `${sourceId}-circle`,
          type: 'symbol',
          source: sourceId,
          filter: ['==', ['geometry-type'], 'Point'],
          layout: {
            'icon-image': pointImageId,
            'icon-size': 1,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            visibility,
          },
        },
        beforeId,
      );
    } else {
      map.setLayoutProperty(`${sourceId}-circle`, 'visibility', visibility);
      map.setLayoutProperty(`${sourceId}-circle`, 'icon-image', pointImageId);
    }

    // ----- Labels -----
    // Per-feature text labels. The expression `coalesce(name, Name, NAME,
    // title, OBJECTID, fid, id, '')` picks the first available property
    // so we work across GeoJSON, KML and shapefile-derived layers
    // (which use different naming conventions).
    const labelsVisible = layer.style.showLabels && layer.visible && projectVisible
      ? 'visible'
      : 'none';
    // MapLibre's generated types don't accept arbitrary expression
    // arrays for `text-field`, so we declare the expression as `any`
    // — it's still a valid runtime expression the renderer accepts.
    // `coalesce` returns the first named property that is set, so we
    // try the Site-ID-style identifier columns first (most ecology
    // shapefiles use them) before falling back to generic name/title
    // properties and finally numeric ids.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const labelExpression: any = [
      'coalesce',
      // Site ID variants — what Biologic's shapefiles actually use.
      ['get', 'Site ID'],
      ['get', 'Site_ID'],
      ['get', 'SiteID'],
      ['get', 'site_id'],
      ['get', 'siteId'],
      ['get', 'siteID'],
      ['get', 'SITE_ID'],
      ['get', 'SITEID'],
      // Generic name / label fields.
      ['get', 'name'],
      ['get', 'Name'],
      ['get', 'NAME'],
      ['get', 'title'],
      ['get', 'Title'],
      ['get', 'label'],
      // Numeric ID fall-backs (cast to string so text-field accepts them).
      ['to-string', ['get', 'OBJECTID']],
      ['to-string', ['get', 'FID']],
      ['to-string', ['get', 'fid']],
      ['to-string', ['get', 'id']],
      '',
    ];

    // Point feature labels — sit just below the symbol.
    if (!map.getLayer(`${sourceId}-point-label`)) {
      map.addLayer(
        {
          id: `${sourceId}-point-label`,
          type: 'symbol',
          source: sourceId,
          filter: ['==', ['geometry-type'], 'Point'],
          layout: {
            'text-field': labelExpression,
            'text-font': ['Noto Sans Regular'],
            'text-size': 11,
            'text-anchor': 'top',
            'text-offset': [0, 0.8],
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'text-max-width': 8,
            visibility: labelsVisible,
          },
          paint: {
            'text-color': '#000000',
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1.4,
          },
        },
        beforeId,
      );
    } else {
      map.setLayoutProperty(`${sourceId}-point-label`, 'visibility', labelsVisible);
    }

    // Polygon "watermark" labels — placed at the polygon's centroid,
    // smaller and partially transparent so they don't overpower the
    // basemap. MapLibre's `symbol-placement: 'point'` with the polygon
    // source uses each feature's centroid automatically.
    if (!map.getLayer(`${sourceId}-polygon-label`)) {
      map.addLayer(
        {
          id: `${sourceId}-polygon-label`,
          type: 'symbol',
          source: sourceId,
          filter: ['any',
            ['==', ['geometry-type'], 'Polygon'],
            ['==', ['geometry-type'], 'MultiPolygon'],
          ],
          layout: {
            'text-field': labelExpression,
            'text-font': ['Noto Sans Regular'],
            'text-size': 11,
            'text-anchor': 'center',
            'symbol-placement': 'point',
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'text-max-width': 8,
            visibility: labelsVisible,
          },
          paint: {
            'text-color': '#000000',
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1.4,
            // Slightly faded so it reads as a subtle watermark, not a
            // shouty label.
            'text-opacity': 0.75,
          },
        },
        beforeId,
      );
    } else {
      map.setLayoutProperty(`${sourceId}-polygon-label`, 'visibility', labelsVisible);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Canvas helpers — generate per-layer point and pattern images.       */
/* These are small (24x24 / 16x16), drawn with the layer's colour, and */
/* registered with the map so MapLibre can use them as icon-image and  */
/* fill-pattern values respectively.                                    */
/* ------------------------------------------------------------------ */

/** Generate an ImageData for a point shape, drawn in the given colour. */
function createPointShapeImageData(
  shape: PointShape,
  color: string,
  outlineColor?: string,
): ImageData {
  const W = 28;
  const H = 28;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);
  ctx.fillStyle = color;
  // Outline: drawn in `outlineColor` when set, otherwise no outline
  // (transparent stroke). Width 1.5 reads cleanly at the 14×14 logical
  // size used for our point icons.
  const hasOutline = !!outlineColor;
  if (hasOutline) {
    ctx.strokeStyle = outlineColor!;
    ctx.lineWidth = 1.5;
  }
  const c = 7;

  switch (shape) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(c, c, 5, 0, Math.PI * 2);
      ctx.fill();
      if (hasOutline) ctx.stroke();
      break;
    case 'square':
      ctx.fillRect(2, 2, 10, 10);
      if (hasOutline) ctx.strokeRect(2, 2, 10, 10);
      break;
    case 'triangle': {
      ctx.beginPath();
      ctx.moveTo(c, 1);
      ctx.lineTo(13, 13);
      ctx.lineTo(1, 13);
      ctx.closePath();
      ctx.fill();
      if (hasOutline) ctx.stroke();
      break;
    }
    case 'diamond': {
      ctx.beginPath();
      ctx.moveTo(c, 1);
      ctx.lineTo(13, c);
      ctx.lineTo(c, 13);
      ctx.lineTo(1, c);
      ctx.closePath();
      ctx.fill();
      if (hasOutline) ctx.stroke();
      break;
    }
    case 'star': {
      const r1 = 6;
      const r2 = r1 * 0.45;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? r1 : r2;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const x = c + r * Math.cos(a);
        const y = c + r * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      if (hasOutline) ctx.stroke();
      break;
    }
    case 'cross': {
      // Cross uses two strokes. Outline (when present) is drawn first,
      // wider, in the outline colour; the foreground crosses paint on top.
      if (hasOutline) {
        ctx.strokeStyle = outlineColor!;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(2, 2); ctx.lineTo(12, 12);
        ctx.moveTo(12, 2); ctx.lineTo(2, 12);
        ctx.stroke();
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(2, 2); ctx.lineTo(12, 12);
      ctx.moveTo(12, 2); ctx.lineTo(2, 12);
      ctx.stroke();
      break;
    }
  }

  return ctx.getImageData(0, 0, W, H);
}

function createFillPatternImageData(pattern: FillPattern, color: string): ImageData {
  const W = 16;
  const H = 16;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);
  ctx.fillStyle = color + '33';
  ctx.fillRect(0, 0, 8, 8);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.2;
  switch (pattern) {
    case 'hatch-left':
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(8, 8);
      ctx.moveTo(-4, 4); ctx.lineTo(4, 12);
      ctx.moveTo(4, -4); ctx.lineTo(12, 4);
      ctx.stroke();
      break;
    case 'hatch-right':
      ctx.beginPath();
      ctx.moveTo(8, 0); ctx.lineTo(0, 8);
      ctx.moveTo(12, 4); ctx.lineTo(4, 12);
      ctx.moveTo(4, -4); ctx.lineTo(-4, 4);
      ctx.stroke();
      break;
    case 'horizontal':
      ctx.beginPath();
      ctx.moveTo(0, 4); ctx.lineTo(8, 4);
      ctx.stroke();
      break;
    case 'vertical':
      ctx.beginPath();
      ctx.moveTo(4, 0); ctx.lineTo(4, 8);
      ctx.stroke();
      break;
    case 'dots':
      ctx.beginPath();
      ctx.arc(4, 4, 1.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'solid':
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 8, 8);
      break;
  }
  return ctx.getImageData(0, 0, W, H);
}
