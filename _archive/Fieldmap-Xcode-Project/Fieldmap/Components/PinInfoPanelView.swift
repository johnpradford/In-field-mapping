import SwiftUI
import CoreLocation

/// Bottom panel that shows pin/feature details when tapped on the map.
///
/// IMPORTANT: This panel must NEVER auto-dismiss when the user taps inside it.
/// Earlier versions had a `.onTapGesture` on the whole VStack that closed the panel
/// on any tap - including taps on the Edit buttons, which made editing impossible.
/// The panel now closes ONLY via the explicit close button or via Save/Cancel from
/// the inline editors.
struct PinInfoPanelView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var locationManager: LocationManager

    @State private var editorMode: EditorMode = .none
    @State private var noteDraft: String = ""
    @State private var showDeleteConfirm: Bool = false

    enum EditorMode { case none, note, style }

    var body: some View {
        VStack {
            Spacer()
            VStack(spacing: 0) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color(hex: "#C7D3D3"))
                    .frame(width: 36, height: 4)
                    .padding(.top, 12)
                    .padding(.bottom, 8)

                if let pin = appState.selectedPin {
                    headerRow(for: pin)
                    detailRows(for: pin)
                    Group {
                        switch editorMode {
                        case .none:  actionButtons
                        case .note:  noteEditor
                        case .style: styleEditor
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 14)
                    .padding(.bottom, 20)
                }
            }
            .background(Color.white)
            .cornerRadius(16, corners: [.topLeft, .topRight])
            .shadow(color: .black.opacity(0.1), radius: 10, y: -4)
            .padding(.bottom, 106)
        }
        // NO global .onTapGesture - that was the dismiss-on-edit bug.
        .alert("Delete this pin?", isPresented: $showDeleteConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                appState.showInfoPanel = false
                appState.showToast("Pin deleted")
            }
        } message: {
            Text("This action cannot be undone.")
        }
    }

    @ViewBuilder
    private func headerRow(for pin: Pin) -> some View {
        HStack(spacing: 8) {
            Text("\(pin.number)")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white)
                .frame(width: 28, height: 28)
                .background(Color(hex: "#1C4A50"))
                .clipShape(Circle())
            Text("Pin \(pin.number)")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Color(hex: "#1C4A50"))
            Spacer()
            Button(action: { closePanel() }) {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Color(hex: "#1C4A50"))
                    .frame(width: 32, height: 32)
                    .background(Color(hex: "#E4EAEA"))
                    .clipShape(Circle())
            }
            .accessibilityLabel("Close")
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 12)
    }

    @ViewBuilder
    private func detailRows(for pin: Pin) -> some View {
        VStack(spacing: 0) {
            InfoRow(label: "Coordinates", value: formatCoordinate(pin.coordinate))
            if let alt = pin.altitude { InfoRow(label: "Altitude", value: "\(Int(alt)) m") }
            InfoRow(label: "Accuracy", value: "\u{00B1}\(Int(pin.accuracy)) m")
            if let userLoc = locationManager.currentLocation {
                let dist = pin.distance(from: userLoc.coordinate)
                let bearing = pin.bearing(from: userLoc.coordinate)
                InfoRow(label: "Distance", value: "\(Int(dist)) m \(bearingDirection(bearing))")
                InfoRow(label: "Bearing",  value: String(format: "%.1f\u{00B0}", bearing))
            }
            InfoRow(label: "Time", value: formatDate(pin.timestamp))
        }
        .padding(.horizontal, 20)
    }

    @ViewBuilder
    private var actionButtons: some View {
        VStack(spacing: 10) {
            HStack(spacing: 10) {
                ActionButton(label: "Edit Style", style: .accent) {
                    withAnimation(.easeInOut(duration: 0.2)) { editorMode = .style }
                }
                ActionButton(label: "Edit Note", style: .secondary) {
                    noteDraft = appState.selectedPin?.note ?? ""
                    withAnimation(.easeInOut(duration: 0.2)) { editorMode = .note }
                }
            }
            HStack(spacing: 10) {
                ActionButton(label: "Share / Export", style: .subtle) {
                    appState.navigate(to: .export)
                }
                ActionButton(label: "Delete", style: .destructive) {
                    showDeleteConfirm = true
                }
            }
        }
    }

    @ViewBuilder
    private var noteEditor: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("NOTE")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(Color(hex: "#9AAFAF"))
            TextEditor(text: $noteDraft)
                .frame(minHeight: 90)
                .padding(8)
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(hex: "#D5DEDE"), lineWidth: 1))
            HStack(spacing: 10) {
                ActionButton(label: "Cancel", style: .secondary) {
                    withAnimation(.easeInOut(duration: 0.2)) { editorMode = .none }
                }
                ActionButton(label: "Save Note", style: .primary) {
                    appState.showToast("Note saved")
                    withAnimation(.easeInOut(duration: 0.2)) { editorMode = .none }
                }
            }
        }
    }

    @ViewBuilder
    private var styleEditor: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("PIN STYLE")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(Color(hex: "#9AAFAF"))
            HStack(spacing: 10) {
                ForEach(["#1C4A50", "#577A7A", "#AFA96E", "#E87D2F", "#E6007E", "#9B8EC4"], id: \.self) { hex in
                    Circle()
                        .fill(Color(hex: hex))
                        .frame(width: 32, height: 32)
                        .onTapGesture { appState.showToast("Pin colour set") }
                }
            }
            Toggle("Show outline (off by default)", isOn: .constant(false))
                .font(.system(size: 13))
                .toggleStyle(SwitchToggleStyle(tint: Color(hex: "#1C4A50")))
            HStack(spacing: 10) {
                ActionButton(label: "Cancel", style: .secondary) {
                    withAnimation(.easeInOut(duration: 0.2)) { editorMode = .none }
                }
                ActionButton(label: "Save Style", style: .primary) {
                    appState.showToast("Style saved")
                    withAnimation(.easeInOut(duration: 0.2)) { editorMode = .none }
                }
            }
        }
    }

    private func closePanel() {
        withAnimation(.easeInOut(duration: 0.2)) {
            editorMode = .none
            appState.showInfoPanel = false
        }
    }

    private func formatCoordinate(_ coord: CLLocationCoordinate2D) -> String {
        String(format: "%.6f, %.6f", coord.latitude, coord.longitude)
    }
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "dd MMM yyyy, HH:mm"
        return formatter.string(from: date)
    }
    private func bearingDirection(_ bearing: Double) -> String {
        let directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
        let index = Int((bearing + 22.5) / 45.0) % 8
        return directions[index]
    }
}

struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Color(hex: "#577A7A"))
            Spacer()
            Text(value)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(Color(hex: "#1C4A50"))
                .multilineTextAlignment(.trailing)
        }
        .padding(.vertical, 6)
        .overlay(Rectangle().fill(Color(hex: "#E4EAEA")).frame(height: 1), alignment: .bottom)
    }
}

struct ActionButton: View {
    enum Style { case primary, accent, subtle, secondary, destructive }

    let label: String
    let style: Style
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(foregroundColor)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(backgroundColor)
                .cornerRadius(12)
        }
    }

    private var foregroundColor: Color {
        switch style {
        case .primary:     return .white
        case .accent:      return Color(hex: "#E87D2F")
        case .subtle:      return Color(hex: "#1C4A50")
        case .secondary:   return Color(hex: "#1C4A50")
        case .destructive: return Color(hex: "#D93025")
        }
    }
    private var backgroundColor: Color {
        switch style {
        case .primary:     return Color(hex: "#1C4A50")
        case .accent:      return Color(hex: "#E87D2F").opacity(0.12)
        case .subtle:      return Color(hex: "#1C4A50").opacity(0.08)
        case .secondary:   return Color(hex: "#E4EAEA")
        case .destructive: return Color(hex: "#FDE8E8")
        }
    }
}

extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat
    var corners: UIRectCorner
    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(roundedRect: rect, byRoundingCorners: corners, cornerRadii: CGSize(width: radius, height: radius))
        return Path(path.cgPath)
    }
}
