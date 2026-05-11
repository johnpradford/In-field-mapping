import SwiftUI
import CoreLocation

/// The main map screen - this is where users spend 90% of their time
struct MapScreenView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var locationManager: LocationManager

    @State private var mapRotation: Double = 0
    @State private var northLocked: Bool = false
    @State private var legendExpanded: Bool = true

    var body: some View {
        ZStack {
            // MARK: - Map (MapLibre)
            MapLibreView(
                pins: $appState.pins,
                measurePoints: $appState.measurePoints,
                isMeasuring: $appState.isMeasuring,
                onPinTap: { pin in
                    appState.selectedPin = pin
                    appState.showInfoPanel = true
                },
                onMapTap: { coordinate in
                    handleMapTap(at: coordinate)
                }
            )
            .ignoresSafeArea()

            // MARK: - North Arrow (top right)
            VStack {
                HStack {
                    Spacer()
                    NorthArrowView(isLocked: $northLocked, rotation: mapRotation)
                        .onTapGesture { toggleNorthLock() }
                }
                .padding(.top, 60)
                .padding(.trailing, 16)
                Spacer()
            }

            // MARK: - Legend (top left)
            VStack {
                HStack {
                    LegendView(isExpanded: $legendExpanded)
                    Spacer()
                }
                .padding(.top, 60)
                .padding(.leading, 16)
                Spacer()
            }

            // MARK: - Scale Bar
            VStack {
                Spacer()
                HStack {
                    ScaleBarView()
                        .padding(.leading, 16)
                    Spacer()
                }
                .padding(.bottom, 120)
            }

            // MARK: - GPS Accuracy Badge
            if let accuracy = locationManager.currentLocation?.horizontalAccuracy {
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        GPSAccuracyBadge(accuracy: accuracy)
                            .padding(.trailing, 16)
                    }
                    .padding(.bottom, 120)
                }
            }

            // MARK: - Recording Banner
            if appState.isRecording {
                RecordingBannerView(
                    startTime: appState.recordingStartTime,
                    distance: appState.recordingDistance
                )
            }

            // MARK: - Measure Hints
            if appState.isMeasuring && appState.measurePoints.isEmpty {
                MeasureHintView(text: "Tap map to place first point")
            } else if appState.isMeasuring && appState.measurePoints.count == 1 {
                MeasureHintView(text: "Tap map to add next point")
            }

            // MARK: - Measure Total
            if appState.isMeasuring && appState.measurePoints.count >= 2 {
                VStack {
                    Spacer()
                    MeasureTotalView(points: appState.measurePoints)
                        .padding(.bottom, 130)
                }
            }

            // MARK: - Stop Recording Button
            if appState.isRecording {
                VStack {
                    Spacer()
                    Button(action: { appState.stopRecording() }) {
                        HStack(spacing: 8) {
                            Image(systemName: "stop.fill")
                            Text("Stop Recording").fontWeight(.bold)
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 40)
                        .padding(.vertical, 14)
                        .background(Color(hex: "#D93025"))
                        .cornerRadius(28)
                        .shadow(color: Color(hex: "#D93025").opacity(0.4), radius: 8, y: 4)
                    }
                    .padding(.bottom, 100)
                }
            }

            // MARK: - Clear Measure Button
            if appState.isMeasuring && appState.measurePoints.count >= 2 {
                VStack {
                    Spacer()
                    Button(action: { clearMeasure() }) {
                        HStack(spacing: 8) {
                            Image(systemName: "xmark").fontWeight(.bold)
                            Text("Clear Measurement").fontWeight(.bold)
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 32)
                        .padding(.vertical, 12)
                        .background(Color(hex: "#1C4A50"))
                        .cornerRadius(24)
                        .shadow(radius: 6, y: 4)
                    }
                    .padding(.bottom, 100)
                }
            }

            // MARK: - Undo Toast
            if appState.showUndoToast, let pin = appState.lastCreatedPin {
                UndoToastView(message: "Pin \(pin.number) created", onUndo: { appState.undoLastPin() })
            }

            // MARK: - Success Toast
            if let message = appState.toastMessage {
                SuccessToastView(message: message)
            }

            // MARK: - Info Panel
            if appState.showInfoPanel {
                PinInfoPanelView()
                    .transition(.move(edge: .bottom))
            }

            // MARK: - Bottom Bar
            VStack {
                Spacer()
                BottomBarView()
            }

            // MARK: - More Menu Overlay
            if appState.showMoreMenu {
                MoreMenuView()
            }

            // MARK: - Import + Export FABs (stacked, bottom-right)
            // Import on top (teal), Export below (orange) - the more frequently used
            // shortcut sits closest to the thumb.
            if !appState.isRecording && !appState.isMeasuring {
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        VStack(spacing: 12) {
                            Button(action: { appState.navigate(to: .importData) }) {
                                Image(systemName: "arrow.down.doc")
                                    .font(.system(size: 22, weight: .semibold))
                                    .foregroundColor(.white)
                                    .frame(width: 50, height: 50)
                                    .background(Color(hex: "#1C4A50"))
                                    .clipShape(Circle())
                                    .shadow(color: Color(hex: "#1C4A50").opacity(0.4), radius: 6, y: 4)
                            }
                            .accessibilityLabel("Import layers")

                            Button(action: { appState.navigate(to: .export) }) {
                                Image(systemName: "square.and.arrow.up")
                                    .font(.system(size: 22, weight: .semibold))
                                    .foregroundColor(.white)
                                    .frame(width: 50, height: 50)
                                    .background(Color(hex: "#E87D2F"))
                                    .clipShape(Circle())
                                    .shadow(color: Color(hex: "#E87D2F").opacity(0.4), radius: 6, y: 4)
                            }
                            .accessibilityLabel("Export and share")
                        }
                        .padding(.trailing, 16)
                    }
                    .padding(.bottom, 100)
                }
            }
        }
        .onAppear {
            locationManager.requestPermission()
            locationManager.startUpdatingLocation()
        }
    }

    // MARK: - Actions

    private func handleMapTap(at coordinate: CLLocationCoordinate2D) {
        switch appState.activeTool {
        case .pin:
            let accuracy = locationManager.currentAccuracy
            appState.dropPin(at: coordinate, accuracy: accuracy)
        case .measure:
            break
        default:
            appState.showInfoPanel = false
        }
    }

    private func toggleNorthLock() { northLocked.toggle() }

    private func clearMeasure() {
        appState.measurePoints = []
        appState.isMeasuring = false
        appState.activeTool = .none
    }
}
