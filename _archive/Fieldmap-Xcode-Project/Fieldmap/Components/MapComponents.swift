import SwiftUI

// MARK: - North Arrow
//
// Redesigned compass:
//   * Always-visible red north needle + grey south needle + tick marks at the 4 cardinals
//   * Bold red "N" letter at the top so direction reads at a glance
//   * Locked state inverts colours (teal background, white compass) and shows a small
//     lock badge so the user can tell at a glance whether the map will rotate or not.
//   * The whole compass counter-rotates with map heading so North needle stays "up" relative to north.

struct NorthArrowView: View {
    @Binding var isLocked: Bool
    var rotation: Double // map heading in degrees clockwise from north

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            ZStack {
                // Background circle + outer ring
                Circle()
                    .fill(isLocked ? Color(hex: "#1C4A50") : Color.white)
                    .overlay(Circle().stroke(Color(hex: "#1C4A50"), lineWidth: 2))
                    .shadow(color: .black.opacity(0.18), radius: 4, y: 2)

                // The compass face counter-rotates with map heading so the red needle
                // continues to point to true north on screen.
                CompassFace(isLocked: isLocked)
                    .rotationEffect(.degrees(-rotation))
            }
            .frame(width: 46, height: 46)

            // Lock badge (only visible in locked state)
            if isLocked {
                ZStack {
                    Circle().fill(Color(hex: "#E87D2F"))
                    Image(systemName: "lock.fill")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.white)
                }
                .frame(width: 16, height: 16)
                .shadow(color: .black.opacity(0.3), radius: 1.5, y: 1)
                .offset(x: 4, y: 4)
            }
        }
        .accessibilityLabel(isLocked ? "Compass — locked north up. Tap to unlock map rotation." : "Compass. Tap to lock map north up.")
    }
}

private struct CompassFace: View {
    let isLocked: Bool

    var body: some View {
        Canvas { ctx, size in
            let cx = size.width / 2
            let cy = size.height / 2
            let r  = min(size.width, size.height) / 2

            // Tick marks at 4 cardinals
            let tickColor = isLocked ? Color.white.opacity(0.5) : Color(hex: "#1C4A50")
            for angle in stride(from: 0.0, to: 360.0, by: 90.0) {
                let rad = angle * .pi / 180
                let x1 = cx + sin(rad) * (r * 0.78)
                let y1 = cy - cos(rad) * (r * 0.78)
                let x2 = cx + sin(rad) * (r * 0.92)
                let y2 = cy - cos(rad) * (r * 0.92)
                var path = Path()
                path.move(to: CGPoint(x: x1, y: y1))
                path.addLine(to: CGPoint(x: x2, y: y2))
                ctx.stroke(path, with: .color(tickColor), lineWidth: 1.5)
            }

            // North needle (red)
            var north = Path()
            north.move(to: CGPoint(x: cx, y: cy - r * 0.78))
            north.addLine(to: CGPoint(x: cx - r * 0.22, y: cy + r * 0.05))
            north.addLine(to: CGPoint(x: cx, y: cy - r * 0.10))
            north.addLine(to: CGPoint(x: cx + r * 0.22, y: cy + r * 0.05))
            north.closeSubpath()
            ctx.fill(north, with: .color(Color(hex: "#D93025")))

            // South needle (white if locked, grey if not)
            var south = Path()
            south.move(to: CGPoint(x: cx, y: cy + r * 0.78))
            south.addLine(to: CGPoint(x: cx - r * 0.22, y: cy - r * 0.05))
            south.addLine(to: CGPoint(x: cx, y: cy + r * 0.10))
            south.addLine(to: CGPoint(x: cx + r * 0.22, y: cy - r * 0.05))
            south.closeSubpath()
            ctx.fill(south, with: .color(isLocked ? Color.white.opacity(0.7) : Color(hex: "#9AAFAF")))

            // "N" label
            let labelText = Text("N")
                .font(.system(size: r * 0.34, weight: .heavy))
                .foregroundColor(isLocked ? .white : Color(hex: "#D93025"))
            ctx.draw(labelText, at: CGPoint(x: cx, y: cy - r * 0.95))
        }
    }
}

// MARK: - Scale Bar

struct ScaleBarView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Rectangle()
                .fill(Color(hex: "#1C4A50"))
                .frame(width: 80, height: 2)
                .overlay(
                    HStack {
                        Rectangle().fill(Color(hex: "#1C4A50")).frame(width: 2, height: 8)
                        Spacer()
                        Rectangle().fill(Color(hex: "#1C4A50")).frame(width: 2, height: 8)
                    }
                    .frame(width: 80),
                    alignment: .bottom
                )
            
            Text("100 m")
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(Color(hex: "#1C4A50"))
        }
    }
}

// MARK: - Legend

struct LegendView: View {
    @Binding var isExpanded: Bool
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            Button(action: { withAnimation { isExpanded.toggle() } }) {
                HStack(spacing: 6) {
                    Image(systemName: "chevron.down")
                        .font(.system(size: 10, weight: .bold))
                        .rotationEffect(.degrees(isExpanded ? 0 : -90))
                    Text("Legend")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(hex: "#1C4A50"))
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
            }
            .buttonStyle(.plain)
            
            // Items
            if isExpanded {
                VStack(alignment: .leading, spacing: 3) {
                    // Dynamically show visible layers
                    // DEVELOPER: Replace with actual layer data
                    LegendItem(color: Color(hex: "#9AAFAF"), shape: .polygon, name: "Cave Entrance Zone")
                    LegendItem(color: Color(hex: "#AFA96E"), shape: .line, name: "Access Track")
                    LegendItem(color: Color(hex: "#E87D2F"), shape: .point, name: "Survey Points")
                }
                .padding(.horizontal, 12)
                .padding(.bottom, 8)
            }
        }
        .background(Color.white.opacity(0.92))
        .cornerRadius(10)
        .shadow(color: .black.opacity(0.12), radius: 4, y: 2)
    }
}

struct LegendItem: View {
    enum Shape { case polygon, line, point }
    
    let color: Color
    let shape: Shape
    let name: String
    
    var body: some View {
        HStack(spacing: 8) {
            switch shape {
            case .polygon:
                RoundedRectangle(cornerRadius: 2)
                    .fill(color.opacity(0.5))
                    .overlay(RoundedRectangle(cornerRadius: 2).stroke(color, lineWidth: 1.5))
                    .frame(width: 14, height: 14)
            case .line:
                Rectangle()
                    .fill(color)
                    .frame(width: 14, height: 3)
                    .cornerRadius(1.5)
            case .point:
                Circle()
                    .fill(color)
                    .frame(width: 10, height: 10)
            }
            
            Text(name)
                .font(.system(size: 11))
                .foregroundColor(Color(hex: "#1C4A50"))
        }
        .padding(.vertical, 2)
    }
}

// MARK: - GPS Accuracy Badge

struct GPSAccuracyBadge: View {
    let accuracy: Double
    
    var body: some View {
        Text("±\(Int(accuracy))m")
            .font(.system(size: 10, weight: .semibold))
            .foregroundColor(Color(hex: "#2D7DD2"))
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Color.white.opacity(0.85))
            .cornerRadius(4)
    }
}

// MARK: - Recording Banner

struct RecordingBannerView: View {
    let startTime: Date?
    let distance: Double
    
    @State private var elapsed: TimeInterval = 0
    let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    
    var body: some View {
        VStack {
            HStack(spacing: 8) {
                Circle()
                    .fill(Color.white)
                    .frame(width: 8, height: 8)
                    .opacity(pulseOpacity)
                
                Text("Recording — \(formattedElapsed) — \(formattedDistance)")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(Color(hex: "#D93025"))
            
            Spacer()
        }
        .padding(.top, 54) // Below status bar
        .onReceive(timer) { _ in
            if let start = startTime {
                elapsed = Date().timeIntervalSince(start)
            }
        }
    }
    
    @State private var pulseOpacity: Double = 1
    
    private var formattedElapsed: String {
        let hours = Int(elapsed) / 3600
        let minutes = (Int(elapsed) % 3600) / 60
        let seconds = Int(elapsed) % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }
    
    private var formattedDistance: String {
        if distance < 1000 {
            return "\(Int(distance)) m"
        } else {
            return String(format: "%.1f km", distance / 1000)
        }
    }
}

// MARK: - Measure Hint

struct MeasureHintView: View {
    let text: String
    
    var body: some View {
        VStack {
            Text(text)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color(hex: "#1C4A50"))
                .cornerRadius(20)
            Spacer()
        }
        .padding(.top, 60)
    }
}

// MARK: - Measure Total Display

struct MeasureTotalView: View {
    let points: [CGPoint]
    
    var body: some View {
        VStack(spacing: 2) {
            Text("Total: \(totalDistance) m")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(Color(hex: "#1C4A50"))
            Text("\(points.count - 1) segment\(points.count - 1 == 1 ? "" : "s")")
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(Color(hex: "#577A7A"))
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 10)
        .background(Color.white.opacity(0.95))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.15), radius: 6, y: 2)
    }
    
    private var totalDistance: Int {
        // Approximate distance from screen points (developer: replace with real coordinate distance)
        var total: Double = 0
        for i in 1..<points.count {
            let dx = points[i].x - points[i-1].x
            let dy = points[i].y - points[i-1].y
            total += sqrt(dx*dx + dy*dy) * 1.5 // ~1.5m per pixel placeholder
        }
        return Int(total)
    }
}

// MARK: - Undo Toast

struct UndoToastView: View {
    let message: String
    let onUndo: () -> Void
    
    var body: some View {
        VStack {
            HStack(spacing: 12) {
                Text(message)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white)
                
                Button(action: onUndo) {
                    Text("Undo")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 4)
                        .background(Color.white.opacity(0.2))
                        .cornerRadius(12)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .background(Color(hex: "#1C4A50"))
            .cornerRadius(24)
            .shadow(color: .black.opacity(0.2), radius: 8, y: 4)
            
            Spacer()
        }
        .padding(.top, 60)
    }
}

// MARK: - Success Toast

struct SuccessToastView: View {
    let message: String
    
    var body: some View {
        VStack {
            HStack(spacing: 8) {
                Image(systemName: "checkmark")
                    .font(.system(size: 14, weight: .bold))
                Text(message)
                    .font(.system(size: 13, weight: .semibold))
            }
            .foregroundColor(.white)
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .background(Color(hex: "#2E7D32"))
            .cornerRadius(24)
            .shadow(color: .black.opacity(0.2), radius: 8, y: 4)
            
            Spacer()
        }
        .padding(.top, 60)
    }
}
