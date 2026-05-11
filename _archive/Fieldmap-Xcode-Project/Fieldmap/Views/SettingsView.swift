import SwiftUI

/// App settings — base map, units, GPS configuration
struct SettingsView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var databaseManager: DatabaseManager
    
    @State private var mapSource = "Satellite (Esri)"
    @State private var distanceUnit = "Metric"
    @State private var coordinateFormat = "Decimal Degrees"
    @State private var trackSampling = "Every 3 m"
    @State private var timeSafetyNet = "Every 30 s"
    @State private var autosaveInterval = "Every 30 s"
    
    var body: some View {
        VStack(spacing: 0) {
            ScreenHeader(title: "Settings", onBack: { appState.goBack() })
            
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    SectionLabel(text: "Base Map")
                    SettingsRow(label: "Map Source", value: mapSource)
                    SettingsRow(label: "Offline Regions", value: "1 downloaded")
                    
                    SectionLabel(text: "Units")
                    SettingsRow(label: "Distance", value: distanceUnit)
                    SettingsRow(label: "Coordinates", value: coordinateFormat)
                    
                    SectionLabel(text: "GPS")
                    SettingsRow(label: "Track Sampling", value: trackSampling)
                    SettingsRow(label: "Time Safety Net", value: timeSafetyNet)
                    SettingsRow(label: "Autosave Interval", value: autosaveInterval)
                    
                    // Brand footer
                    VStack(spacing: 4) {
                        // Biologic logo placeholder
                        Image(systemName: "leaf.fill")
                            .font(.system(size: 24))
                            .foregroundColor(Color(hex: "#AFA96E"))
                        
                        Text("Fieldmap")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(Color(hex: "#1C4A50"))
                        
                        Text("Version 1.0.0 (Build 1)")
                            .font(.system(size: 12))
                            .foregroundColor(Color(hex: "#9AAFAF"))
                        
                        Text("Biologic Environmental")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(Color(hex: "#1C4A50"))
                            .padding(.top, 8)
                        
                        Text("www.biologicenv.com.au")
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "#9AAFAF"))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
                }
            }
            .background(Color(hex: "#F6F8F8"))
        }
    }
}

struct SettingsRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(Color(hex: "#1C4A50"))
            Spacer()
            Text(value)
                .font(.system(size: 14))
                .foregroundColor(Color(hex: "#577A7A"))
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
