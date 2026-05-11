import SwiftUI

/// Main container view that handles screen routing
struct ContentView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        ZStack {
            switch appState.currentScreen {
            case .map:
                MapScreenView()
                
            case .projects:
                ProjectsView()
                
            case .projectDetail(let project):
                ProjectDetailView(project: project)
                
            case .layers:
                LayersView()
                
            case .layerDetail(let layer):
                LayerDetailView(layer: layer)
                
            case .importData:
                ImportView()
                
            case .exportData:
                ExportView()
                
            case .settings:
                SettingsView()
            }
        }
        .animation(.easeInOut(duration: 0.2), value: appState.currentScreen.id)
    }
}

// Make Screen identifiable for animations
extension AppState.Screen {
    var id: String {
        switch self {
        case .map: return "map"
        case .projects: return "projects"
        case .projectDetail(let p): return "projectDetail-\(p.id)"
        case .layers: return "layers"
        case .layerDetail(let l): return "layerDetail-\(l.id)"
        case .importData: return "import"
        case .exportData: return "export"
        case .settings: return "settings"
        }
    }
}
