import SwiftUI

/// Lists all projects with visibility toggles (max 4 visible at once)
struct ProjectsView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var databaseManager: DatabaseManager
    
    private let maxVisibleProjects = 4
    @State private var showMaxWarning = false
    
    var visibleProjects: [Project] {
        databaseManager.projects.filter { $0.isVisible }
    }
    
    var hiddenProjects: [Project] {
        databaseManager.projects.filter { !$0.isVisible }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            ScreenHeader(title: "Projects", onBack: { appState.goBack() }) {
                Button("+ New") {
                    let colors = ["#1C4A50", "#AFA96E", "#9B8EC4", "#E87D2F", "#577A7A"]
                    let color = colors.randomElement() ?? "#1C4A50"
                    let project = Project(name: "New Project", color: color)
                    databaseManager.saveProject(project)
                    appState.showToast("New project created")
                }
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color(hex: "#1C4A50"))
                .cornerRadius(10)
            }
            
            // Body
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Projects group your imported layers. Toggle visibility to show/hide all layers in a project at once. Up to 4 projects can be visible simultaneously.")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "#577A7A"))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    
                    if !visibleProjects.isEmpty {
                        SectionLabel(text: "Visible Projects (\(visibleProjects.count) of \(maxVisibleProjects) max)")
                        
                        ForEach(visibleProjects) { project in
                            ProjectRow(project: project, onToggle: {
                                toggleVisibility(project)
                            }, onTap: {
                                appState.navigate(to: .projectDetail(project))
                            })
                        }
                    }
                    
                    if !hiddenProjects.isEmpty {
                        SectionLabel(text: "Hidden Projects")
                        
                        ForEach(hiddenProjects) { project in
                            ProjectRow(project: project, onToggle: {
                                toggleVisibility(project)
                            }, onTap: {
                                appState.navigate(to: .projectDetail(project))
                            })
                        }
                    }
                }
            }
            .background(Color(hex: "#F6F8F8"))
        }
        .alert("Maximum 4 Projects Visible", isPresented: $showMaxWarning) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("You already have 4 projects visible on the map. Please hide one before making another visible.")
        }
    }
    
    private func toggleVisibility(_ project: Project) {
        if !project.isVisible && visibleProjects.count >= maxVisibleProjects {
            showMaxWarning = true
            return
        }
        var updated = project
        updated.isVisible.toggle()
        databaseManager.saveProject(updated)
    }
}

struct ProjectRow: View {
    let project: Project
    let onToggle: () -> Void
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 14) {
                Image(systemName: "folder.fill")
                    .foregroundColor(.white)
                    .frame(width: 40, height: 40)
                    .background(Color(hex: project.color))
                    .cornerRadius(10)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(project.name)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(Color(hex: "#1C4A50"))
                    Text("Modified \(project.modifiedAt.relativeFormatted)")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "#577A7A"))
                }
                
                Spacer()
                
                VStack(spacing: 2) {
                    Text(project.isVisible ? "Visible" : "Hidden")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(Color(hex: "#9AAFAF"))
                        .textCase(.uppercase)
                    
                    Toggle("", isOn: .constant(project.isVisible))
                        .labelsHidden()
                        .tint(Color(hex: "#1C4A50"))
                        .onTapGesture { onToggle() }
                }
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
}

// MARK: - Date formatter extension

extension Date {
    var relativeFormatted: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: self, relativeTo: Date())
    }
}
