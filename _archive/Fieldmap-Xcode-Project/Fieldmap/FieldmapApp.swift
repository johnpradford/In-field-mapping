import SwiftUI

@main
struct FieldmapApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var locationManager = LocationManager()
    @StateObject private var databaseManager = DatabaseManager()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .environmentObject(locationManager)
                .environmentObject(databaseManager)
                .preferredColorScheme(.light)
        }
    }
}
