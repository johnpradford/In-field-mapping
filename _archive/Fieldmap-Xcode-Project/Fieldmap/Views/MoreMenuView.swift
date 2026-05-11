import SwiftUI

/// Slide-up menu with access to Projects, Layers, Export, Import, Settings
struct MoreMenuView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        ZStack {
            // Dimmed background
            Color.black.opacity(0.3)
                .ignoresSafeArea()
                .onTapGesture { appState.showMoreMenu = false }
            
            VStack {
                Spacer()
                
                VStack(spacing: 0) {
                    // Handle
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color(hex: "#C7D3D3"))
                        .frame(width: 36, height: 4)
                        .padding(.top, 12)
                        .padding(.bottom, 20)
                    
                    // Menu Items
                    MoreMenuItem(
                        icon: "folder",
                        iconColor: Color(hex: "#1C4A50"),
                        iconBackground: Color(hex: "#1C4A50").opacity(0.08),
                        title: "Projects",
                        subtitle: "Group and manage imported layers"
                    ) {
                        appState.showMoreMenu = false
                        appState.navigate(to: .projects)
                    }
                    
                    MoreMenuItem(
                        icon: "square.3.layers.3d",
                        iconColor: Color(hex: "#AFA96E"),
                        iconBackground: Color(hex: "#AFA96E").opacity(0.12),
                        title: "Layers",
                        subtitle: "Visibility, labels, styling"
                    ) {
                        appState.showMoreMenu = false
                        appState.navigate(to: .layers)
                    }
                    
                    MoreMenuItem(
                        icon: "arrow.up.doc",
                        iconColor: Color(hex: "#E87D2F"),
                        iconBackground: Color(hex: "#E87D2F").opacity(0.1),
                        title: "Export",
                        subtitle: "Layers, pins, tracks as GeoJSON"
                    ) {
                        appState.showMoreMenu = false
                        appState.navigate(to: .exportData)
                    }
                    
                    MoreMenuItem(
                        icon: "arrow.down.doc",
                        iconColor: Color(hex: "#1C4A50"),
                        iconBackground: Color(hex: "#B8D4E3").opacity(0.3),
                        title: "Import",
                        subtitle: "Shapefiles, KML, GPX, GeoJSON"
                    ) {
                        appState.showMoreMenu = false
                        appState.navigate(to: .importData)
                    }
                    
                    MoreMenuItem(
                        icon: "gearshape",
                        iconColor: Color(hex: "#577A7A"),
                        iconBackground: Color(hex: "#577A7A").opacity(0.1),
                        title: "Settings",
                        subtitle: "Base map, GPS, preferences"
                    ) {
                        appState.showMoreMenu = false
                        appState.navigate(to: .settings)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 34)
                .background(Color.white)
                .cornerRadius(20, corners: [.topLeft, .topRight])
            }
        }
    }
}

struct MoreMenuItem: View {
    let icon: String
    let iconColor: Color
    let iconBackground: Color
    let title: String
    let subtitle: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(iconColor)
                    .frame(width: 44, height: 44)
                    .background(iconBackground)
                    .cornerRadius(12)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(Color(hex: "#1C4A50"))
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "#577A7A"))
                }
                
                Spacer()
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 4)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
