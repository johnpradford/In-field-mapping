import SwiftUI

/// Edit layer styling — colour, opacity, width, labels, display field
struct LayerDetailView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var databaseManager: DatabaseManager
    let layer: Layer
    
    @State private var name: String
    @State private var selectedColor: String
    @State private var opacity: Double
    @State private var outlineWidth: Double
    @State private var showLabels: Bool
    @State private var displayField: String
    @State private var showDeleteConfirm = false
    
    let availableColors = [
        "#1C4A50", "#577A7A", "#9AAFAF", "#AFA96E", "#E87D2F", "#E6007E",
        "#9B8EC4", "#B8D4E3", "#D93025", "#2E7D32", "#F5A623", "#4A90D9"
    ]
    
    let widthOptions: [Double] = [1, 2, 3, 5]
    
    init(layer: Layer) {
        self.layer = layer
        self._name = State(initialValue: layer.name)
        self._selectedColor = State(initialValue: layer.color)
        self._opacity = State(initialValue: layer.opacity * 100)
        self._outlineWidth = State(initialValue: layer.outlineWidth)
        self._showLabels = State(initialValue: layer.showLabels)
        self._displayField = State(initialValue: layer.displayField)
    }
    
    var body: some View {
        VStack(spacing: 0) {
            ScreenHeader(title: "Layer Detail", onBack: { appState.goBack() })
            
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    VStack(alignment: .leading, spacing: 16) {
                        // Name
                        DetailLabel(text: "Layer Name")
                        TextField("Layer name", text: $name)
                            .font(.system(size: 16, weight: .semibold))
                            .padding(14)
                            .background(Color.white)
                            .cornerRadius(12)
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: "#D5DEDE")))
                        
                        // Colour
                        DetailLabel(text: "Colour")
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 6), spacing: 10) {
                            ForEach(availableColors, id: \.self) { color in
                                Circle()
                                    .fill(Color(hex: color))
                                    .frame(width: 40, height: 40)
                                    .overlay(
                                        Circle()
                                            .stroke(Color(hex: "#1C4A50"), lineWidth: selectedColor == color ? 3 : 0)
                                    )
                                    .scaleEffect(selectedColor == color ? 1.1 : 1.0)
                                    .onTapGesture { selectedColor = color }
                                    .animation(.easeInOut(duration: 0.15), value: selectedColor)
                            }
                        }
                        
                        // Opacity
                        DetailLabel(text: "Opacity")
                        HStack(spacing: 12) {
                            Slider(value: $opacity, in: 0...100, step: 5)
                                .tint(Color(hex: "#1C4A50"))
                            Text("\(Int(opacity))%")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(Color(hex: "#1C4A50"))
                                .frame(minWidth: 40, alignment: .trailing)
                        }
                        
                        // Outline Width
                        DetailLabel(text: "Outline Width")
                        HStack(spacing: 10) {
                            ForEach(widthOptions, id: \.self) { width in
                                Button(action: { outlineWidth = width }) {
                                    Text("\(Int(width))pt")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(outlineWidth == width ? Color(hex: "#1C4A50") : Color(hex: "#577A7A"))
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .background(outlineWidth == width ? Color(hex: "#1C4A50").opacity(0.05) : Color.white)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 10)
                                                .stroke(outlineWidth == width ? Color(hex: "#1C4A50") : Color(hex: "#D5DEDE"), lineWidth: 2)
                                        )
                                        .cornerRadius(10)
                                }
                            }
                        }
                        
                        // Display Field
                        DetailLabel(text: "Display Field")
                        Picker("", selection: $displayField) {
                            Text("name").tag("name")
                            Text("zone_id").tag("zone_id")
                            Text("survey_date").tag("survey_date")
                            Text("status").tag("status")
                        }
                        .pickerStyle(.menu)
                        .padding(14)
                        .background(Color.white)
                        .cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: "#D5DEDE")))
                        
                        // Labels toggle
                        DetailLabel(text: "Labels")
                        HStack(spacing: 12) {
                            Toggle("", isOn: $showLabels)
                                .labelsHidden()
                                .tint(Color(hex: "#1C4A50"))
                            Text("Show labels on map")
                                .font(.system(size: 14))
                                .foregroundColor(Color(hex: "#577A7A"))
                        }
                        
                        // Save button
                        Button(action: saveLayer) {
                            Text("Save & Update Map")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Color(hex: "#1C4A50"))
                                .cornerRadius(12)
                        }
                        .padding(.top, 8)
                        
                        // Move button
                        Button(action: { /* Show move sheet */ }) {
                            Text("Move to Another Project")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(Color(hex: "#1C4A50"))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Color(hex: "#1C4A50").opacity(0.08))
                                .cornerRadius(12)
                        }
                        
                        // Delete button
                        Button(action: { showDeleteConfirm = true }) {
                            Text("Delete Layer")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(Color(hex: "#D93025"))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Color(hex: "#FDE8E8"))
                                .cornerRadius(12)
                        }
                    }
                    .padding(20)
                }
            }
            .background(Color(hex: "#F6F8F8"))
        }
        .alert("Delete Layer?", isPresented: $showDeleteConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                databaseManager.deleteLayer(layer)
                appState.goBack()
            }
        } message: {
            Text("This will remove \"\(layer.name)\" and all its features.")
        }
    }
    
    private func saveLayer() {
        var updated = layer
        updated.name = name
        updated.color = selectedColor
        updated.opacity = opacity / 100
        updated.outlineWidth = outlineWidth
        updated.showLabels = showLabels
        updated.displayField = displayField
        databaseManager.saveLayer(updated)
        appState.showToast("Layer saved — map updated")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            appState.currentScreen = .map
            appState.navigationStack = []
        }
    }
}

struct DetailLabel: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(Color(hex: "#9AAFAF"))
            .textCase(.uppercase)
            .tracking(0.5)
    }
}
