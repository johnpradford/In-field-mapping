import Foundation
import CoreLocation

/// A dropped pin with GPS coordinates and metadata
struct Pin: Identifiable, Codable, Equatable {
    let id: UUID
    let number: Int
    let coordinate: CLLocationCoordinate2D
    let altitude: Double?
    let accuracy: Double
    let timestamp: Date
    var note: String
    
    init(number: Int, coordinate: CLLocationCoordinate2D, altitude: Double?, accuracy: Double, timestamp: Date, note: String) {
        self.id = UUID()
        self.number = number
        self.coordinate = coordinate
        self.altitude = altitude
        self.accuracy = accuracy
        self.timestamp = timestamp
        self.note = note
    }
    
    // Custom Codable for CLLocationCoordinate2D
    enum CodingKeys: String, CodingKey {
        case id, number, latitude, longitude, altitude, accuracy, timestamp, note
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        number = try container.decode(Int.self, forKey: .number)
        let lat = try container.decode(Double.self, forKey: .latitude)
        let lon = try container.decode(Double.self, forKey: .longitude)
        coordinate = CLLocationCoordinate2D(latitude: lat, longitude: lon)
        altitude = try container.decodeIfPresent(Double.self, forKey: .altitude)
        accuracy = try container.decode(Double.self, forKey: .accuracy)
        timestamp = try container.decode(Date.self, forKey: .timestamp)
        note = try container.decode(String.self, forKey: .note)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(number, forKey: .number)
        try container.encode(coordinate.latitude, forKey: .latitude)
        try container.encode(coordinate.longitude, forKey: .longitude)
        try container.encodeIfPresent(altitude, forKey: .altitude)
        try container.encode(accuracy, forKey: .accuracy)
        try container.encode(timestamp, forKey: .timestamp)
        try container.encode(note, forKey: .note)
    }
    
    static func == (lhs: Pin, rhs: Pin) -> Bool {
        lhs.id == rhs.id
    }
    
    /// Distance from another coordinate in metres
    func distance(from other: CLLocationCoordinate2D) -> Double {
        let pinLocation = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        let otherLocation = CLLocation(latitude: other.latitude, longitude: other.longitude)
        return pinLocation.distance(from: otherLocation)
    }
    
    /// Bearing from another coordinate in degrees
    func bearing(from other: CLLocationCoordinate2D) -> Double {
        let lat1 = other.latitude.radians
        let lon1 = other.longitude.radians
        let lat2 = coordinate.latitude.radians
        let lon2 = coordinate.longitude.radians
        
        let dLon = lon2 - lon1
        let y = sin(dLon) * cos(lat2)
        let x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon)
        let radiansBearing = atan2(y, x)
        
        return (radiansBearing.degrees + 360).truncatingRemainder(dividingBy: 360)
    }
}

private extension Double {
    var radians: Double { self * .pi / 180 }
    var degrees: Double { self * 180 / .pi }
}
