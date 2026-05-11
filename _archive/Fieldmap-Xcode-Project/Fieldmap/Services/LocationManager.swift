import Foundation
import CoreLocation
import Combine

/// Manages GPS location for the app — current position, accuracy, and track recording
class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    
    @Published var currentLocation: CLLocation?
    @Published var currentAccuracy: Double = 0
    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined
    @Published var isTrackingActive: Bool = false
    
    // Track recording
    private var trackPoints: [TrackPoint] = []
    private var lastTrackPoint: CLLocation?
    
    /// Minimum distance (metres) between recorded track points
    var trackSamplingDistance: Double = 3.0
    
    /// Time-based safety net interval (seconds)
    var trackSamplingInterval: TimeInterval = 30.0
    private var lastSampleTime: Date?
    
    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.allowsBackgroundLocationUpdates = true
        manager.pausesLocationUpdatesAutomatically = false
        manager.showsBackgroundLocationIndicator = true
    }
    
    // MARK: - Public Methods
    
    func requestPermission() {
        manager.requestWhenInUseAuthorization()
    }
    
    func requestAlwaysPermission() {
        manager.requestAlwaysAuthorization()
    }
    
    func startUpdatingLocation() {
        manager.startUpdatingLocation()
    }
    
    func stopUpdatingLocation() {
        manager.stopUpdatingLocation()
    }
    
    /// Start recording a track
    func startTrackRecording() {
        isTrackingActive = true
        trackPoints = []
        lastTrackPoint = nil
        lastSampleTime = Date()
        
        // Ensure we have background permission for track recording
        if authorizationStatus == .authorizedWhenInUse {
            requestAlwaysPermission()
        }
    }
    
    /// Stop recording and return the collected points
    func stopTrackRecording() -> [TrackPoint] {
        isTrackingActive = false
        let points = trackPoints
        trackPoints = []
        lastTrackPoint = nil
        return points
    }
    
    /// Total distance of current recording in metres
    func currentRecordingDistance() -> Double {
        guard trackPoints.count >= 2 else { return 0 }
        var total: Double = 0
        for i in 1..<trackPoints.count {
            let prev = CLLocation(latitude: trackPoints[i-1].coordinate.latitude,
                                  longitude: trackPoints[i-1].coordinate.longitude)
            let curr = CLLocation(latitude: trackPoints[i].coordinate.latitude,
                                  longitude: trackPoints[i].coordinate.longitude)
            total += curr.distance(from: prev)
        }
        return total
    }
    
    // MARK: - CLLocationManagerDelegate
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        
        currentLocation = location
        currentAccuracy = location.horizontalAccuracy
        
        // Record track point if recording is active
        if isTrackingActive {
            let shouldSample: Bool
            
            if let lastPoint = lastTrackPoint {
                let distance = location.distance(from: lastPoint)
                let timeSinceLastSample = Date().timeIntervalSince(lastSampleTime ?? Date.distantPast)
                
                // Sample if moved enough OR time safety net
                shouldSample = distance >= trackSamplingDistance || timeSinceLastSample >= trackSamplingInterval
            } else {
                // Always record first point
                shouldSample = true
            }
            
            if shouldSample {
                let point = TrackPoint(
                    coordinate: location.coordinate,
                    altitude: location.altitude,
                    accuracy: location.horizontalAccuracy,
                    timestamp: Date()
                )
                trackPoints.append(point)
                lastTrackPoint = location
                lastSampleTime = Date()
            }
        }
    }
    
    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        authorizationStatus = status
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location error: \(error.localizedDescription)")
    }
}
