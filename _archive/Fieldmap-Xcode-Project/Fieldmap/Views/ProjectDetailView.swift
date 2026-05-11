import SwiftUI

/// Shows layers within a single project
struct ProjectDetailView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var databaseManager: DatabaseManager
    let project: Project
    
    var projectLayers: [Layer] {
        databaseManager.layers(for: project)
    }
    
    var body: some View {
        VStack(spacing: 0) {
            ScreenHeader(title: project.name, onBack: { appState.goBack() }) {
                Button("+ Import") {
                    appState.navigate(to: .importData)
                }
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color(hex: "#1C4A50"))
                .cornerRadius(10)
            }
            
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    SectionLabel(text: "Layers in this project")
                    
                    ForEach(projectLayers) { layer in
                        LayerRow(layer: layer) {
                            appState.navigate(to: .layerDetail(layer))
                        }
                    }
                    
                    Button(action: { appState.navigate(to: .importData) }) {
                        Text("+ Import Layer to this Project")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color(hex: "#1C4A50"))
                            .cornerRadius(12)
                    }
                    .padding(20)
                }
            }
            .background(Color(hex: "#F6F8F8"))
        }
    }
}

struct LayerRow: View {
    let layer: Layer
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                // Colour swatch
                layerSwatch
                
                Text(layer.name)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(Color(hex: "#1C4A50"))
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "#9AAFAF"))
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            .background(Color.white)
        }
        .buttonStyle(.plain)
        .overlay(
            Rectangle().fill(Color(hex: "#E4EAEA")).frame(height: 1),
            alignment: .bottom
        )
    }
    
    @ViewBuilder
    private var layerSwatch: some View {
        switch layer.geometryType {
        case .polygon:
            RoundedRectangle(cornerRadius: 4)
                .fill(Color(hex: layer.color))
                .frame(width: 18, height: 18)
        case .line:
            Rectangle()
                .fill(Color(hex: layer.color))
                .frame(width: 18, height: 4)
                .cornerRadius(2)
        case .point:
            Circle()
                .fill(Color(hex: layer.color))
                .frame(width: 14, height: 14)
        }
    }
}
