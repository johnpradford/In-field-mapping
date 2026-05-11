import SwiftUI

/// The main bottom toolbar - Pin, Record, Measure, More
struct BottomBarView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        HStack(spacing: 0) {
            BarButton(
                icon: "mappin.and.ellipse",
                label: "Pin",
                isActive: appState.activeTool == .pin,
                isRecording: false,
                action: tapPin
            )

            BarButton(
                icon: "record.circle",
                label: "Record",
                isActive: appState.activeTool == .record,
                isRecording: appState.isRecording,
                action: tapRecord
            )

            // Measure icon: filled ruler - chosen for instant visual clarity.
            // Field testing showed the previous abstract glyph was unreadable
            // without the "Measure" label below it.
            BarButton(
                icon: "ruler.fill",
                label: "Measure",
                isActive: appState.activeTool == .measure,
                isRecording: false,
                action: tapMeasure
            )

            BarButton(
                icon: "ellipsis",
                label: "More",
                isActive: false,
                isRecording: false,
                action: tapMore
            )
        }
        .padding(.top, 8)
        .padding(.bottom, 34) // Safe area for home indicator
        .background(
            Color.white.opacity(0.96)
                .background(.ultraThinMaterial)
        )
        .overlay(
            Rectangle()
                .frame(height: 1)
                .foregroundColor(Color(hex: "#D5DEDE")),
            alignment: .top
        )
    }

    // MARK: - Actions

    private func tapPin() {
        appState.showMoreMenu = false
        appState.showInfoPanel = false

        if appState.activeTool == .pin {
            appState.activeTool = .none
        } else {
            if !appState.isRecording { clearMeasure() }
            appState.activeTool = .pin

            if let location = LocationManager().currentLocation {
                appState.dropPin(at: location.coordinate, accuracy: location.horizontalAccuracy)
            }
        }
    }

    private func tapRecord() {
        appState.showMoreMenu = false
        appState.showInfoPanel = false
        clearMeasure()

        if !appState.isRecording {
            appState.startRecording()
        }
    }

    private func tapMeasure() {
        appState.showMoreMenu = false
        appState.showInfoPanel = false

        if appState.isMeasuring {
            if appState.measurePoints.isEmpty {
                appState.isMeasuring = false
                appState.activeTool = .none
            }
        } else {
            appState.isMeasuring = true
            appState.measurePoints = []
            appState.activeTool = .measure
        }
    }

    private func tapMore() {
        appState.showMoreMenu = true
    }

    private func clearMeasure() {
        appState.measurePoints = []
        appState.isMeasuring = false
        if appState.activeTool == .measure {
            appState.activeTool = .none
        }
    }
}

// MARK: - Individual Bar Button

struct BarButton: View {
    let icon: String
    let label: String
    let isActive: Bool
    let isRecording: Bool
    let action: () -> Void

    private var foregroundColor: Color {
        if isRecording { return Color(hex: "#D93025") }
        if isActive { return Color(hex: "#1C4A50") }
        return Color(hex: "#577A7A")
    }

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 24))
                Text(label)
                    .font(.system(size: 10, weight: .semibold))
            }
            .foregroundColor(foregroundColor)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
