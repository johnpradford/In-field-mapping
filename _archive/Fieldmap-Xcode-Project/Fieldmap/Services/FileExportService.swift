import Foundation
import CoreLocation

/// Handles exporting data as GeoJSON, GPX, or .fieldmap format
class FileExportService {
    
    // MARK: - Export Pins as GeoJSON
    
    func exportPinsAsGeoJSON(_ pins: [Pin]) -> Data? {
        var features: [[String: Any]] = []
        
        for pin in pins {
            let feature: [String: Any] = [
                "type": "Feature",
                "geometry": [
                    "type": "Point",
                    "coordinates": [pin.coordinate.longitude, pin.coordinate.latitude]
                ],
                "properties": [
                    "number": pin.number,
                    "note": pin.note,
                    "accuracy": pin.accuracy,
                    "altitude": pin.altitude ?? NSNull(),
                    "timestamp": ISO8601DateFormatter().string(from: pin.timestamp)
                ]
            ]
            features.append(feature)
        }
        
        let geoJSON: [String: Any] = [
            "type": "FeatureCollection",
            "features": features
        ]
        
        return try? JSONSerialization.data(withJSONObject: geoJSON, options: .prettyPrinted)
    }
    
    // MARK: - Export Track as GPX
    
    func exportTrackAsGPX(_ track: Track) -> Data? {
        var gpx = """
        <?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1" creator="Fieldmap"
             xmlns="http://www.topografix.com/GPX/1/1">
          <metadata>
            <name>Track \(ISO8601DateFormatter().string(from: track.startTime))</name>
            <time>\(ISO8601DateFormatter().string(from: track.startTime))</time>
          </metadata>
          <trk>
            <name>Track</name>
            <trkseg>
        """
        
        for point in track.points {
            gpx += """
                  <trkpt lat="\(point.coordinate.latitude)" lon="\(point.coordinate.longitude)">
            """
            if let alt = point.altitude {
                gpx += "        <ele>\(alt)</ele>\n"
            }
            gpx += """
                    <time>\(ISO8601DateFormatter().string(from: point.timestamp))</time>
                  </trkpt>
            """
        }
        
        gpx += """
            </trkseg>
          </trk>
        </gpx>
        """
        
        return gpx.data(using: .utf8)
    }
    
    // MARK: - Export Track as GeoJSON
    
    func exportTrackAsGeoJSON(_ track: Track) -> Data? {
        let coordinates: [[Double]] = track.points.map { point in
            if let alt = point.altitude {
                return [point.coordinate.longitude, point.coordinate.latitude, alt]
            }
            return [point.coordinate.longitude, point.coordinate.latitude]
        }
        
        let geoJSON: [String: Any] = [
            "type": "FeatureCollection",
            "features": [[
                "type": "Feature",
                "geometry": [
                    "type": "LineString",
                    "coordinates": coordinates
                ],
                "properties": [
                    "startTime": ISO8601DateFormatter().string(from: track.startTime),
                    "endTime": ISO8601DateFormatter().string(from: track.endTime),
                    "distance": track.totalDistance,
                    "duration": track.duration
                ]
            ]]
        ]
        
        return try? JSONSerialization.data(withJSONObject: geoJSON, options: .prettyPrinted)
    }
    
    // MARK: - Export Layer (pass-through GeoJSON)
    
    func exportLayerAsGeoJSON(_ layer: Layer) -> Data? {
        return layer.geoJSONData?.data(using: .utf8)
    }
    
    // MARK: - Export Entire Project as .fieldmap
    
    func exportProject(_ project: Project, layers: [Layer], pins: [Pin], tracks: [Track]) -> Data? {
        let file = FieldmapFile(project: project, layers: layers, pins: pins, tracks: tracks)
        return try? file.toJSON()
    }
    
    // MARK: - Write to temporary file for sharing
    
    func writeToTempFile(data: Data, filename: String) -> URL? {
        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent(filename)
        
        do {
            try data.write(to: fileURL)
            return fileURL
        } catch {
            print("Error writing temp file: \(error)")
            return nil
        }
    }
}
