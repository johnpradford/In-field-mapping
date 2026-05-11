import Foundation

/// The .fieldmap file format — a JSON container for a whole project
struct FieldmapFile: Codable {
    let version: String
    let exportedAt: Date
    let project: Project
    let layers: [Layer]
    let pins: [Pin]
    let tracks: [Track]
    
    init(project: Project, layers: [Layer], pins: [Pin], tracks: [Track]) {
        self.version = "1.0"
        self.exportedAt = Date()
        self.project = project
        self.layers = layers
        self.pins = pins
        self.tracks = tracks
    }
    
    /// Encode to JSON data
    func toJSON() throws -> Data {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return try encoder.encode(self)
    }
    
    /// Decode from JSON data
    static func fromJSON(_ data: Data) throws -> FieldmapFile {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(FieldmapFile.self, from: data)
    }
}
