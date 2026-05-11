import Foundation
import CoreLocation

/// A single point in a recorded track
struct TrackPoint: Identifiable, Codable {
    let id: UUID
    let coordinate: CLLocationCoordinate2D
    let altitude: Double?
    let accuracy: Double
    let timestamp: Date
    
    init(coordinate: CLLocationCoordinate2D, altitude: Double?, accuracy: Double, timestamp: Date) {
        self.id = UUID()
        self.coordinate = coordinate
        self.altitude = altitude
        self.accuracy = accuracy
        self.timestamp = timestamp
    }
    
    // Custom Codable for CLLocationCoordinate2D
    enum CodingKeys: String, CodingKey {
        case id, latitude, longitude, altitude, accuracy, timestamp
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        let lat = try container.decode(Double.self, forKey: .latitude)
        let lon = try container.decode(Double.self, forKey: .longitude)
        coordinate = CLLocationCoordinate2D(latitude: lat, longitude: lon)
        altitude = try container.decodeIfPresent(Double.self, forKey: .altitude)
        accuracy = try container.decode(Double.self, forKey: .accuracy)
        timestamp = try container.decode(Date.self, forKey: .timestamp)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(coordinate.latitude, forKey: .latitude)
        try container.encode(coordinate.longitude, forKey: .longitude)
        try container.encodeIfPresent(altitude, forKey: .altitude)
        try container.encode(accuracy, forKey: .accuracy)
        try container.encode(timestamp, forKey: .timestamp)
    }
}

/// A complete recorded track (sequence of GPS points over time)
struct Track: Identifiable, Codable {
    let id: UUID
    let points: [TrackPoint]
    let startTime: Date
    let endTime: Date
    let totalDistance: Double // in metres
    
    /// Duration in seconds
    var duration: TimeInterval {
        endTime.timeIntervalSince(startTime)
    }
    
    /// Formatted duration string (e.g. "00:04:32")
    var durationFormatted: String {
        let hours = Int(duration) / 3600
        let minutes = (Int(duration) % 3600) / 60
        let seconds = Int(duration) % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }
    
    /// Formatted distance (e.g. "218 m" or "1.2 km")
    var distanceFormatted: String {
        if totalDistance < 1000 {
            return "\(Int(totalDistance)) m"
        } else {
            return String(format: "%.1f km", totalDistance / 1000)
        }
    }
}
