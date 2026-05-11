import Foundation
import CoreLocation
import SwiftUI

/// Type of geometry a layer contains
enum GeometryType: String, Codable {
    case point
    case line
    case polygon
}

/// Optional non-intrusive label style for polygons.
/// `.standard` shows a single short label centered in the polygon.
/// `.watermark` shows the name as a faint diagonal stripe overlay across the polygon -
/// useful when nearby point labels would otherwise overlap.
/// `.none` hides the label entirely.
enum PolygonLabelStyle: String, Codable {
    case none
    case standard
    case watermark
}

/// A spatial data layer imported from a file.
///
/// IMPORTANT (v1.1): polygons have *separate* fill and outline colours and *separate*
/// opacity sliders for each. Lines have one colour + opacity + width. Points (pins)
/// default to NO outline - outline is opt-in via `showOutline`. Field testing showed
/// the previous always-on green outline obscured the marker colour the user chose.
struct Layer: Identifiable, Codable, Equatable {
    let id: UUID
    var name: String
    var geometryType: GeometryType
    var projectId: UUID

    // FILL (used for polygons and points)
    var fillColor: String
    var fillOpacity: Double

    // OUTLINE / STROKE (independent from fill)
    var showOutline: Bool
    var outlineColor: String
    var outlineOpacity: Double
    var outlineWidth: Double

    // LABEL
    var labelStyle: PolygonLabelStyle
    var displayField: String

    var isVisible: Bool
    var geoJSONData: String?

    init(name: String, geometryType: GeometryType, color: String, projectId: UUID) {
        self.id = UUID()
        self.name = name
        self.geometryType = geometryType
        self.projectId = projectId

        self.fillColor = color
        self.fillOpacity = (geometryType == .polygon) ? 0.25 : 1.0

        // Outline default: ON for polygons & lines, OFF for points
        self.showOutline = geometryType != .point
        self.outlineColor = color
        self.outlineOpacity = (geometryType == .polygon) ? 0.7 : 1.0
        self.outlineWidth = (geometryType == .point) ? 0 : 2

        self.labelStyle = .standard
        self.displayField = "name"
        self.isVisible = true
        self.geoJSONData = nil
    }

    static func == (lhs: Layer, rhs: Layer) -> Bool { lhs.id == rhs.id }

    var fillSwiftUIColor: Color    { Color(hex: fillColor).opacity(fillOpacity) }
    var outlineSwiftUIColor: Color { Color(hex: outlineColor).opacity(outlineOpacity) }

    /// Backwards-compat shims for older code that referenced `.color` and `.opacity`.
    var color: String       { get { fillColor } set { fillColor = newValue } }
    var opacity: Double     { get { fillOpacity } set { fillOpacity = newValue } }
    var swiftUIColor: Color { fillSwiftUIColor }
    var showLabels: Bool    { get { labelStyle != .none } set { labelStyle = newValue ? .standard : .none } }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        let scanner = Scanner(string: hex)
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)
        let r = Double((rgbValue & 0xFF0000) >> 16) / 255.0
        let g = Double((rgbValue & 0x00FF00) >> 8) / 255.0
        let b = Double(rgbValue & 0x0000FF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}
