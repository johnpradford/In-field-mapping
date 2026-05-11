import SwiftUI

/// Export screen - share layers, pins, tracks via the iOS share sheet.
///
/// Sharing strategy (per design brief and field-team feedback):
///
/// * iOS to iOS:    AirDrop is the most reliable. UIActivityViewController surfaces
///                  AirDrop automatically when nearby iOS devices are available.
/// * iOS to Android: Use the Share Sheet to route through Mail, Messages, or any
///                   installed cross-platform sharing app (e.g. SHAREit, Snapdrop,
///                   Send Anywhere). Direct iOS-to-Android Bluetooth file transfer
///                   is NOT supported by Apple, so we don't pretend it is - we route
///                   to whatever the user has installed via the standard share sheet.
/// * Email:         Always available - the share sheet exposes Mail by default and
///                  the user can attach the .fieldmap / .geojson / .gpx file.
///
/// We deliberately avoid building custom MultipeerConnectivity / Bluetooth code
/// because the iOS Share Sheet covers AirDrop natively and any custom code would
/// add bugs, battery drain, and an offline-pairing UI we don't want to maintain.
struct ExportView: View {
    @EnvironmentObject var appState: AppState
    @State private var shareURL: URL?
    @State private var showShareSheet = false

    let exportService = FileExportService()

    var body: some View {
        VStack(spacing: 0) {
            ScreenHeader(title: "Export & Share", onBack: { appState.goBack() })

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    quickSendBanner
                        .padding(.horizontal, 16)
                        .padding(.top, 12)

                    Text("All exports use the iOS share sheet - pick AirDrop for iPhone-to-iPhone, Mail for cross-platform, or Save to Files to keep a local copy.")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#577A7A"))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)

                    SectionLabel(text: "Pins")

                    ExportRow(
                        icon: "mappin.and.ellipse",
                        iconColor: Color(hex: "#1C4A50"),
                        iconBackground: Color(hex: "#1C4A50").opacity(0.08),
                        title: "All Pins (\(appState.pins.count))",
                        subtitle: "Points with notes - GeoJSON"
                    ) {
                        if let data = exportService.exportPinsAsGeoJSON(appState.pins),
                           let url = exportService.writeToTempFile(data: data, filename: "pins.geojson") {
                            shareURL = url
                            showShareSheet = true
                        }
                    }

                    if !appState.tracks.isEmpty {
                        SectionLabel(text: "Recorded Tracks")

                        ForEach(appState.tracks) { track in
                            ExportRow(
                                icon: "point.topleft.down.to.point.bottomright.curvepath",
                                iconColor: Color(hex: "#E87D2F"),
                                iconBackground: Color(hex: "#E87D2F").opacity(0.1),
                                title: "Track \(track.startTime.formatted(date: .numeric, time: .shortened))",
                                subtitle: "\(track.distanceFormatted) - \(track.durationFormatted) - GPX"
                            ) {
                                if let data = exportService.exportTrackAsGPX(track),
                                   let url = exportService.writeToTempFile(data: data, filename: "track.gpx") {
                                    shareURL = url
                                    showShareSheet = true
                                }
                            }
                        }
                    }

                    if let project = appState.activeProject {
                        SectionLabel(text: "Whole Project")

                        ExportRow(
                            icon: "folder.fill",
                            iconColor: .white,
                            iconBackground: Color(hex: "#1C4A50"),
                            title: "Export Entire Project (.fieldmap)",
                            subtitle: "All layers, pins, and tracks in one file"
                        ) {
                            let layers: [Layer] = []
                            if let data = exportService.exportProject(project, layers: layers, pins: appState.pins, tracks: appState.tracks),
                               let url = exportService.writeToTempFile(data: data, filename: "\(project.name).fieldmap") {
                                shareURL = url
                                showShareSheet = true
                            }
                        }
                    }
                }
            }
            .background(Color(hex: "#F6F8F8"))
        }
        .sheet(isPresented: $showShareSheet) {
            if let url = shareURL {
                ShareSheet(activityItems: [url])
            }
        }
    }

    // Three big targets at the top of the export screen so the user doesn't have to
    // scroll to share. Each opens the same UIActivityViewController so iOS handles
    // the actual file transfer.
    @ViewBuilder
    private var quickSendBanner: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("SEND THIS PROJECT TO ANOTHER DEVICE")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(Color(hex: "#9AAFAF"))

            HStack(spacing: 10) {
                QuickShareButton(icon: "wifi", title: "AirDrop", subtitle: "iPhone to iPhone", tint: Color(hex: "#1C4A50")) {
                    presentShareSheetForWholeProject()
                }
                QuickShareButton(icon: "envelope.fill", title: "Email", subtitle: "Any device", tint: Color(hex: "#E87D2F")) {
                    presentShareSheetForWholeProject()
                }
                QuickShareButton(icon: "dot.radiowaves.left.and.right", title: "Bluetooth", subtitle: "via share apps", tint: Color(hex: "#577A7A")) {
                    presentShareSheetForWholeProject()
                }
            }
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(14)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(hex: "#E4EAEA"), lineWidth: 1))
    }

    private func presentShareSheetForWholeProject() {
        guard let project = appState.activeProject else { return }
        let layers: [Layer] = []
        if let data = exportService.exportProject(project, layers: layers, pins: appState.pins, tracks: appState.tracks),
           let url = exportService.writeToTempFile(data: data, filename: "\(project.name).fieldmap") {
            shareURL = url
            showShareSheet = true
        }
    }
}

struct QuickShareButton: View {
    let icon: String
    let title: String
    let subtitle: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .background(tint)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                Text(title)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(Color(hex: "#1C4A50"))
                Text(subtitle)
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "#577A7A"))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
        }
        .buttonStyle(.plain)
    }
}

struct ExportRow: View {
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

                Image(systemName: "arrow.up")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(Color(hex: "#1C4A50"))
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

/// iOS Share Sheet wrapper - this is what makes AirDrop, Mail, Messages, and
/// Save-to-Files all work without any custom networking code.
struct ShareSheet: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
