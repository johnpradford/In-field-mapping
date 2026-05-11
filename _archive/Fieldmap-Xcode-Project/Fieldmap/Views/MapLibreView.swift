import SwiftUI
import CoreLocation

// NOTE FOR DEVELOPER:
// This is a placeholder wrapper for MapLibre GL Native (iOS).
// Add the MapLibre dependency via Swift Package Manager:
//   https://github.com/maplibre/maplibre-gl-native-distribution
//
// Replace this UIViewRepresentable with the real MapLibre implementation.
// Key things to implement:
// 1. Display offline vector/raster tiles
// 2. Render GeoJSON layers (polygons, lines, points)
// 3. Show user GPS location dot with accuracy ring
// 4. Show dropped pins as numbered markers
// 5. Handle tap gestures for pin/feature selection
// 6. Handle tap gestures for measure tool point placement
// 7. Support map rotation with north-lock toggle
// 8. Download and cache offline tile regions

import UIKit

struct MapLibreView: UIViewRepresentable {
    @Binding var pins: [Pin]
    @Binding var measurePoints: [CGPoint]
    @Binding var isMeasuring: Bool
    
    var onPinTap: (Pin) -> Void
    var onMapTap: (CLLocationCoordinate2D) -> Void
    
    func makeUIView(context: Context) -> MapLibreMapView {
        let mapView = MapLibreMapView()
        mapView.delegate = context.coordinator
        return mapView
    }
    
    func updateUIView(_ mapView: MapLibreMapView, context: Context) {
        mapView.updatePins(pins)
        mapView.updateMeasurePoints(measurePoints)
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, MapLibreMapViewDelegate {
        var parent: MapLibreView
        
        init(_ parent: MapLibreView) {
            self.parent = parent
        }
        
        func mapView(_ mapView: MapLibreMapView, didTapAt coordinate: CLLocationCoordinate2D) {
            parent.onMapTap(coordinate)
        }
        
        func mapView(_ mapView: MapLibreMapView, didTapPin pin: Pin) {
            parent.onPinTap(pin)
        }
    }
}

// MARK: - Placeholder MapView (replace with real MapLibre)

protocol MapLibreMapViewDelegate: AnyObject {
    func mapView(_ mapView: MapLibreMapView, didTapAt coordinate: CLLocationCoordinate2D)
    func mapView(_ mapView: MapLibreMapView, didTapPin pin: Pin)
}

class MapLibreMapView: UIView {
    weak var delegate: MapLibreMapViewDelegate?
    
    // DEVELOPER TODO: Replace this entire class with MLNMapView from MapLibre
    // See: https://maplibre.org/maplibre-gl-native/ios/api/
    //
    // Required setup:
    // - Style URL for offline maps (e.g., OpenFreeMap, Protomaps, or Esri satellite)
    // - MLNOfflineStorage for pre-downloading tile regions
    // - MLNShapeSource + MLNFillStyleLayer for polygon layers
    // - MLNShapeSource + MLNLineStyleLayer for line layers
    // - MLNShapeSource + MLNSymbolStyleLayer for point layers
    // - MLNPointAnnotation for pins
    // - User location dot is built into MLNMapView (.showsUserLocation = true)
    
    private var pins: [Pin] = []
    private var measurePoints: [CGPoint] = []
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupPlaceholder()
        setupGestures()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupPlaceholder()
        setupGestures()
    }
    
    private func setupPlaceholder() {
        // Placeholder background — developer replaces with real map
        backgroundColor = UIColor(red: 0.91, green: 0.94, blue: 0.91, alpha: 1.0)
        
        let label = UILabel()
        label.text = "MapLibre Map\n(Developer: integrate MapLibre GL here)"
        label.numberOfLines = 0
        label.textAlignment = .center
        label.textColor = UIColor(red: 0.34, green: 0.48, blue: 0.48, alpha: 0.5)
        label.font = .systemFont(ofSize: 16, weight: .medium)
        label.translatesAutoresizingMaskIntoConstraints = false
        addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: centerXAnchor),
            label.centerYAnchor.constraint(equalTo: centerYAnchor)
        ])
    }
    
    private func setupGestures() {
        let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap(_:)))
        addGestureRecognizer(tap)
    }
    
    @objc private func handleTap(_ gesture: UITapGestureRecognizer) {
        let point = gesture.location(in: self)
        
        // DEVELOPER TODO: Convert screen point to coordinate using MLNMapView.convert(_:toCoordinateFrom:)
        // Placeholder: fake coordinate based on tap position
        let fakeLat = -23.3 + (Double(point.y) / Double(bounds.height)) * 0.01
        let fakeLon = 119.7 + (Double(point.x) / Double(bounds.width)) * 0.01
        let coordinate = CLLocationCoordinate2D(latitude: fakeLat, longitude: fakeLon)
        
        delegate?.mapView(self, didTapAt: coordinate)
    }
    
    func updatePins(_ pins: [Pin]) {
        self.pins = pins
        // DEVELOPER TODO: Update pin annotations on the map
    }
    
    func updateMeasurePoints(_ points: [CGPoint]) {
        self.measurePoints = points
        // DEVELOPER TODO: Draw measure line overlay
    }
}
