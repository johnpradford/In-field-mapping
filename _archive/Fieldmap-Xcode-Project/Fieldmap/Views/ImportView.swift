import SwiftUI
import UniformTypeIdentifiers

/// File import screen — pick format, use iOS document picker
struct ImportView: View {
    @EnvironmentObject var appState: AppState
    @State private var showDocumentPicker = false
    @State private var importError: String?
    
    var body: some View {
        VStack(spacing: 0) {
            ScreenHeader(title: "Import", onBack: { appState.goBack() })
            
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Import spatial data files into a project. Supported formats:")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#577A7A"))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    
                    ImportFormatRow(
                        icon: "tablecells",
                        iconColor: Color(hex: "#1C4A50"),
                        iconBackground: Color(hex: "#1C4A50").opacity(0.08),
                        title: "Shapefile (.shp + .dbf)",
                        subtitle: "Points, lines, and polygons with attributes"
                    ) { showDocumentPicker = true }
                    
                    ImportFormatRow(
                        icon: "mappin.and.ellipse",
                        iconColor: Color(hex: "#E87D2F"),
                        iconBackground: Color(hex: "#E87D2F").opacity(0.1),
                        title: "KML / KMZ",
                        subtitle: "Google Earth format"
                    ) { showDocumentPicker = true }
                    
                    ImportFormatRow(
                        icon: "point.topleft.down.to.point.bottomright.curvepath",
                        iconColor: Color(hex: "#9B8EC4"),
                        iconBackground: Color(hex: "#9B8EC4").opacity(0.12),
                        title: "GPX",
                        subtitle: "GPS tracks and waypoints"
                    ) { showDocumentPicker = true }
                    
                    ImportFormatRow(
                        icon: "doc.text",
                        iconColor: Color(hex: "#AFA96E"),
                        iconBackground: Color(hex: "#AFA96E").opacity(0.12),
                        title: "GeoJSON",
                        subtitle: "Open standard spatial format"
                    ) { showDocumentPicker = true }
                    
                    SectionLabel(text: "Import into")
                    
                    // Currently selected project
                    HStack(spacing: 14) {
                        Image(systemName: "folder.fill")
                            .foregroundColor(.white)
                            .frame(width: 40, height: 40)
                            .background(Color(hex: "#1C4A50"))
                            .cornerRadius(10)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(appState.activeProject?.name ?? "No project selected")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(Color(hex: "#1C4A50"))
                            Text("Currently selected project")
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "#577A7A"))
                        }
                        
                        Spacer()
                        
                        Image(systemName: "checkmark")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(Color(hex: "#2E7D32"))
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 14)
                    .background(Color(hex: "#1C4A50").opacity(0.04))
                }
            }
            .background(Color(hex: "#F6F8F8"))
        }
        .sheet(isPresented: $showDocumentPicker) {
            DocumentPickerView { url in
                handleImport(url: url)
            }
        }
        .alert("Import Error", isPresented: .constant(importError != nil)) {
            Button("OK") { importError = nil }
        } message: {
            Text(importError ?? "")
        }
    }
    
    private func handleImport(url: URL) {
        let importService = FileImportService()
        let projectId = appState.activeProject?.id ?? UUID()
        
        do {
            let layer = try importService.importFile(at: url, into: projectId)
            // Save to database
            appState.showToast("Imported \(layer.name)")
            appState.goBack()
        } catch {
            importError = error.localizedDescription
        }
    }
}

struct ImportFormatRow: View {
    let icon: String
    let iconColor: Color
    let iconBackground: Color
    let title: String
    let subtitle: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(iconColor)
                    .frame(width: 40, height: 40)
                    .background(iconBackground)
                    .cornerRadius(10)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(Color(hex: "#1C4A50"))
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "#577A7A"))
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "#9AAFAF"))
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            .background(Color.white)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .overlay(
            Rectangle().fill(Color(hex: "#E4EAEA")).frame(height: 1),
            alignment: .bottom
        )
    }
}

/// Wrapper for UIDocumentPickerViewController
struct DocumentPickerView: UIViewControllerRepresentable {
    let onPick: (URL) -> Void
    
    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: FileImportService.supportedTypes)
        picker.delegate = context.coordinator
        picker.allowsMultipleSelection = false
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIDocumentPickerViewController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(onPick: onPick)
    }
    
    class Coordinator: NSObject, UIDocumentPickerDelegate {
        let onPick: (URL) -> Void
        
        init(onPick: @escaping (URL) -> Void) {
            self.onPick = onPick
        }
        
        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            if let url = urls.first {
                onPick(url)
            }
        }
    }
}
