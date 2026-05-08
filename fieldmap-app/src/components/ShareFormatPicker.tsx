import type { ShareFormat } from '@/services/fileExportService';

/**
 * Three-button modal asking the user which format to share in.
 * GeoJSON / GPX / KML — each one is suited to different recipients.
 *
 * Used by the Pins layer detail and the Layer feature list. The
 * caller decides what features to share once the format is picked.
 */
export default function ShareFormatPicker({
  open,
  title = 'Share as…',
  message,
  onPick,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message?: string;
  onPick: (format: ShareFormat) => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center px-6"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-teal-dark mb-1">{title}</h2>
        {message && (
          <p className="text-sm text-teal-mid leading-snug mb-3">{message}</p>
        )}
        <div className="space-y-2">
          <FormatButton
            title="GeoJSON"
            blurb="Best for QGIS, ArcGIS and other GIS tools."
            onPress={() => onPick('geojson')}
          />
          <FormatButton
            title="GPX"
            blurb="Best for GPS devices. Points become waypoints."
            onPress={() => onPick('gpx')}
          />
          <FormatButton
            title="KML"
            blurb="Best for Google Earth and Google Maps."
            onPress={() => onPick('kml')}
          />
        </div>
        <div className="flex justify-end mt-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-teal-mid">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function FormatButton({
  title,
  blurb,
  onPress,
}: {
  title: string;
  blurb: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full text-left px-3 py-3 rounded-xl border border-greylight active:bg-greylight"
    >
      <div className="font-semibold text-teal-dark">{title}</div>
      <div className="text-xs text-teal-mid mt-0.5">{blurb}</div>
    </button>
  );
}
