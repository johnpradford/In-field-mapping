import Foundation

/// A project groups imported layers together
struct Project: Identifiable, Codable, Equatable {
    let id: UUID
    var name: String
    var isVisible: Bool
    var color: String // hex colour for project icon
    let createdAt: Date
    var modifiedAt: Date
    
    init(name: String, color: String) {
        self.id = UUID()
        self.name = name
        self.isVisible = true
        self.color = color
        self.createdAt = Date()
        self.modifiedAt = Date()
    }
    
    static func == (lhs: Project, rhs: Project) -> Bool {
        lhs.id == rhs.id
    }
}
