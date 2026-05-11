import SwiftUI
import Combine

/// Central app state that manages navigation, active tools, and shared data
class AppState: ObservableObject {
    
    // MARK: - Navigation
    enum Screen {
        case map
        case projects
        case projectDetail(Project)
        case layers
        case layerDetail(Layer)
        case importData
        case exportData
        case settings
    }
    
    @Published var currentScreen: Screen = .map
    @Published var navigationStack: [Screen] = []
    
    // MARK: - Active Tool
    enum MapTool {
        case none
        case pin
        case record
        case measure
    }
    
    @Published var activeTool: MapTool = .none
    @Published var isRecording: Bool = false
    @Published var recordingStartTime: Date?
    @Published var recordingDistance: Double = 0
    
    // MARK: - More Menu
    @Published var showMoreMenu: Bool = false
    
    // MARK: - Info Panel
    @Published var showInfoPanel: Bool = false
    @Published var selectedPin: Pin?
    @Published var selectedFeature: Layer?
    
    // MARK: - Measure Tool
    @Published var measurePoints: [CGPoint] = []
    @Published var isMeasuring: Bool = false
    
    // MARK: - Toasts
    @Published var toastMessage: String?
    @Published var showUndoToast: Bool = false
    @Published var lastCreatedPin: Pin?
    
    // MARK: - Projects
    @Published var projects: [Project] = []
    @Published var activeProject: Project?
    
    // MARK: - Pins
    @Published var pins: [Pin] = []
    @Published var nextPinNumber: Int = 1
    
    // MARK: - Tracks
    @Published var tracks: [Track] = []
    @Published var currentTrackPoints: [TrackPoint] = []
    
    // MARK: - Navigation Methods
    
    func navigate(to screen: Screen) {
        navigationStack.append(currentScreen)
        currentScreen = screen
    }
    
    func goBack() {
        if let previous = navigationStack.popLast() {
            currentScreen = previous
        } else {
            currentScreen = .map
        }
    }
    
    // MARK: - Tool Methods
    
    func dropPin(at coordinate: CLLocationCoordinate2D, accuracy: Double) {
        let pin = Pin(
            number: nextPinNumber,
            coordinate: coordinate,
            altitude: nil,
            accuracy: accuracy,
            timestamp: Date(),
            note: ""
        )
        pins.append(pin)
        lastCreatedPin = pin
        nextPinNumber += 1
        showUndoToast = true
        activeTool = .none
        
        // Auto-dismiss undo toast after 4 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in
            self?.showUndoToast = false
        }
    }
    
    func undoLastPin() {
        if let _ = lastCreatedPin {
            pins.removeLast()
            nextPinNumber -= 1
            lastCreatedPin = nil
            showUndoToast = false
        }
    }
    
    func startRecording() {
        isRecording = true
        recordingStartTime = Date()
        recordingDistance = 0
        currentTrackPoints = []
        activeTool = .record
    }
    
    func stopRecording() {
        isRecording = false
        activeTool = .none
        
        if !currentTrackPoints.isEmpty {
            let track = Track(
                id: UUID(),
                points: currentTrackPoints,
                startTime: recordingStartTime ?? Date(),
                endTime: Date(),
                totalDistance: recordingDistance
            )
            tracks.append(track)
        }
        
        recordingStartTime = nil
        currentTrackPoints = []
    }
    
    func showToast(_ message: String) {
        toastMessage = message
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
            self?.toastMessage = nil
        }
    }
}

import CoreLocation
