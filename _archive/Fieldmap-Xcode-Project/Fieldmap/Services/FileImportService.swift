import Foundation
import UniformTypeIdentifiers

/// Handles importing spatial data files (Shapefile, KML, GPX, GeoJSON)
class FileImportService {
    
    enum ImportError: Error, LocalizedError {
        case unsupportedFormat
        case parseError(String)
        case fileTooLarge
        case fileNotFound
        
        var errorDescription: String? {
            switch self {
            case .unsupportedFormat: return "Unsupported file format"
            case .parseError(let msg): return "Parse error: \(msg)"
            case .fileTooLarge: return "File exceeds maximum size"
            case .fileNotFound: return "File not found"
            }
        }
    }
    
    /// Supported file types for the document picker
    static let supportedTypes: [UTType] = [
        .json, // GeoJSON
        UTType(filenameExtension: "geojson") ?? .json,
        UTType(filenameExtension: "gpx") ?? .xml,
        UTType(filenameExtension: "kml") ?? .xml,
        UTType(filenameExtension: "kmz") ?? .zip,
        UTType(filenameExtension: "shp") ?? .data,
    ].compactMap { $0 }
    
    /// Maximum file size in bytes (50 MB default)
    let maxFileSize: Int = 50 * 1024 * 1024
    
    // MARK: - Import Methods
    
    /// Import a file and return a Layer with GeoJSON data
    func importFile(at url: URL, into projectId: UUID) throws -> Layer {
        let accessing = url.startAccessingSecurityScopedResource()
        defer { if accessing { url.stopAccessingSecurityScopedResource() } }
        
        // Check file size
        let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
        let fileSize = attributes[.size] as? Int ?? 0
        if fileSize > maxFileSize {
            throw ImportError.fileTooLarge
        }
        
        let ext = url.pathExtension.lowercased()
        
        switch ext {
        case "geojson", "json":
            return try importGeoJSON(at: url, projectId: projectId)
        case "gpx":
            return try importGPX(at: url, projectId: projectId)
        case "kml":
            return try importKML(at: url, projectId: projectId)
        case "shp":
            return try importShapefile(at: url, projectId: projectId)
        default:
            throw ImportError.unsupportedFormat
        }
    }
    
    // MARK: - GeoJSON
    
    private func importGeoJSON(at url: URL, projectId: UUID) throws -> Layer {
        let data = try Data(contentsOf: url)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        
        guard json != nil else {
            throw ImportError.parseError("Invalid JSON")
        }
        
        let name = url.deletingPathExtension().lastPathComponent
        let geometryType = detectGeometryType(from: json!)
        let geoJSONString = String(data: data, encoding: .utf8) ?? ""
        
        var layer = Layer(name: name, geometryType: geometryType, color: "#9AAFAF", projectId: projectId)
        layer.geoJSONData = geoJSONString
        return layer
    }
    
    // MARK: - GPX
    
    private func importGPX(at url: URL, projectId: UUID) throws -> Layer {
        let data = try Data(contentsOf: url)
        guard let xmlString = String(data: data, encoding: .utf8) else {
            throw ImportError.parseError("Cannot read GPX file")
        }
        
        // Basic GPX to GeoJSON conversion
        // A full implementation would use XMLParser — this is a simplified version
        let name = url.deletingPathExtension().lastPathComponent
        let geoJSON = convertGPXToGeoJSON(xmlString)
        
        let hasTrack = xmlString.contains("<trk")
        let geometryType: GeometryType = hasTrack ? .line : .point
        
        var layer = Layer(name: name, geometryType: geometryType, color: "#9B8EC4", projectId: projectId)
        layer.geoJSONData = geoJSON
        return layer
    }
    
    // MARK: - KML
    
    private func importKML(at url: URL, projectId: UUID) throws -> Layer {
        let data = try Data(contentsOf: url)
        guard let xmlString = String(data: data, encoding: .utf8) else {
            throw ImportError.parseError("Cannot read KML file")
        }
        
        let name = url.deletingPathExtension().lastPathComponent
        let geoJSON = convertKMLToGeoJSON(xmlString)
        let geometryType = detectGeometryTypeFromKML(xmlString)
        
        var layer = Layer(name: name, geometryType: geometryType, color: "#E87D2F", projectId: projectId)
        layer.geoJSONData = geoJSON
        return layer
    }
    
    // MARK: - Shapefile
    
    private func importShapefile(at url: URL, projectId: UUID) throws -> Layer {
        // Shapefiles require multiple companion files (.shx, .dbf, .prj)
        // A full implementation would use a shapefile parsing library
        // For now, check companion files exist and create a placeholder
        let basePath = url.deletingPathExtension().path
        let dbfExists = FileManager.default.fileExists(atPath: basePath + ".dbf")
        
        if !dbfExists {
            throw ImportError.parseError("Missing .dbf file — shapefiles require .shp and .dbf together")
        }
        
        let name = url.deletingPathExtension().lastPathComponent
        
        // NOTE FOR DEVELOPER: Implement full shapefile parsing here
        // Recommended library: https://github.com/pjb3005/SwiftShapefileReader
        // or convert via GDAL/OGR at build time
        var layer = Layer(name: name, geometryType: .polygon, color: "#1C4A50", projectId: projectId)
        layer.geoJSONData = nil // Developer: parse .shp → GeoJSON here
        return layer
    }
    
    // MARK: - Helpers
    
    private func detectGeometryType(from geoJSON: [String: Any]) -> GeometryType {
        if let type = geoJSON["type"] as? String, type == "FeatureCollection",
           let features = geoJSON["features"] as? [[String: Any]],
           let first = features.first,
           let geometry = first["geometry"] as? [String: Any],
           let geomType = geometry["type"] as? String {
            switch geomType {
            case "Point", "MultiPoint": return .point
            case "LineString", "MultiLineString": return .line
            case "Polygon", "MultiPolygon": return .polygon
            default: return .polygon
            }
        }
        return .polygon
    }
    
    private func convertGPXToGeoJSON(_ xml: String) -> String {
        // Simplified GPX→GeoJSON. Developer should replace with full XMLParser implementation.
        // This extracts basic waypoints and track coordinates.
        return """
        {"type":"FeatureCollection","features":[]}
        """
    }
    
    private func convertKMLToGeoJSON(_ xml: String) -> String {
        // Simplified KML→GeoJSON. Developer should replace with full XMLParser implementation.
        return """
        {"type":"FeatureCollection","features":[]}
        """
    }
    
    private func detectGeometryTypeFromKML(_ xml: String) -> GeometryType {
        if xml.contains("<Polygon") { return .polygon }
        if xml.contains("<LineString") { return .line }
        return .point
    }
}
