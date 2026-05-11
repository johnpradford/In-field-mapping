import SwiftUI

/// Shows all layers across all projects with visibility and label toggles
struct LayersView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var databaseManager: DatabaseManager
    
    var body: some View {
        VStack(spacing: 0) {
            ScreenHeader(title: "Layers", onBack: { appState.goBack() })
            
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Group layers by project
                    ForEach(databaseManager.projects) { project in
                        let layers = databaseManager.layers(for: project)
                        if !layers.isEmpty {
                            SectionLabel(text: project.name)
                            
                            ForEach(layers) { layer in
                                LayerToggleRow(layer: layer) {
                                    appState.navigate(to: .layerDetail(layer))
                                }
                            }
                        }
                    }
                    
                    // Capture section (pins and tracks)
                    SectionLabel(text: "Capture")
                    
                    CaptureLayerRow(
                        icon: "mappin",
                        name: "Pins (\(appState.pins.count))",
                        color: "#1C4A50"
                    )
                    
                    ForEach(appState.tracks) { track in
                        CaptureLayerRow(
                            icon: "point.topleft.down.to.point.bottomright.curvepath",
                            name: "Track \(track.startTime.formatted(date: .numeric, time: .shortened))",
                            color: "#E87D2F"
                        )
                    }
                }
            }
            .background(Color(hex: "#F6F8F8"))
        }
    }
}

struct LayerToggleRow: View {
    @EnvironmentObject var databaseManager: DatabaseManager
    let layer: Layer
    let onNameTap: () -> Void
    
    @State private var isVisible: Bool
    @State private var showLabels: Bool
    
    init(layer: Layer, onNameTap: @escaping () -> Void) {
        self.layer = layer
        self.onNameTap = onNameTap
        self._isVisible = State(initialValue: layer.isVisible)
        self._showLabels = State(initialValue: layer.showLabels)
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // Colour swatch
            RoundedRectangle(cornerRadius: 4)
                .fill(Color(hex: layer.color))
                .frame(width: 18, height: 18)
            
            // Geometry type icon
            geometryIcon
                .font(.system(size: 16))
                .foregroundColor(Color(hex: "#9AAFAF"))
                .frame(width: 18)
            
            // Name (tappable to go to detail)
            Button(action: onNameTap) {
                Text(layer.name)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(Color(hex: "#1C4A50"))
            }
            
            Spacer()
            
            // Toggles
            HStack(spacing: 6) {
                VStack(spacing: 2) {
                    Text("Vis")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundColor(Color(hex: "#9AAFAF"))
                        .textCase(.uppercase)
                    Toggle("", isOn: $isVisible)
                        .labelsHidden()
                        .tint(Color(hex: "#1C4A50"))
                        .scaleEffect(0.8)
                        .onChange(of: isVisible) { newVal in
                            var updated = layer
                            updated.isVisible = newVal
                            databaseManager.saveLayer(updated)
                        }
                }
                
                VStack(spacing: 2) {
                    Text("Lbl")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundColor(Color(hex: "#9AAFAF"))
                        .textCase(.uppercase)
                    Toggle("", isOn: $showLabels)
                        .labelsHidden()
                        .tint(Color(hex: "#1C4A50"))
                        .scaleEffect(0.8)
                        .onChange(of: showLabels) { newVal in
                            var updated = layer
                            updated.showLabels = newVal
                            databaseManager.saveLayer(updated)
                        }
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
        .background(Color.white)
        .overlay(
            Rectangle().fill(Color(hex: "#E4EAEA")).frame(height: 1),
            alignment: .bottom
        )
    }
    
    @ViewBuilder
    private var geometryIcon: some View {
        switch layer.geometryType {
        case .polygon: Image(systemName: "square")
        case .line: Image(systemName: "point.topleft.down.to.point.bottomright.curvepath")
        case .point: Image(systemName: "circle.fill")
        }
    }
}

struct CaptureLayerRow: View {
    let icon: String
    let name: String
    let color: String
    @State private var isVisible = true
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(Color(hex: color))
                .frame(width: 18)
            
            Text(name)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(Color(hex: "#1C4A50"))
            
            Spacer()
            
            VStack(spacing: 2) {
                Text("Vis")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(Color(hex: "#9AAFAF"))
                    .textCase(.uppercase)
                Toggle("", isOn: $isVisible)
                    .labelsHidden()
                    .tint(Color(hex: "#1C4A50"))
                    .scaleEffect(0.8)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
        .background(Color.white)
        .overlay(
            Rectangle().fill(Color(hex: "#E4EAEA")).frame(height: 1),
            alignment: .bottom
        )
    }
}
