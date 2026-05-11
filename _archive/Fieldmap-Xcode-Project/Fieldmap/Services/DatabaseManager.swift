import Foundation
import SQLite3

/// SQLite database manager for offline storage of all app data
class DatabaseManager: ObservableObject {
    private var db: OpaquePointer?
    private let dbName = "fieldmap.sqlite"
    
    @Published var projects: [Project] = []
    @Published var layers: [Layer] = []
    
    init() {
        openDatabase()
        createTables()
        loadProjects()
        loadLayers()
    }
    
    deinit {
        sqlite3_close(db)
    }
    
    // MARK: - Database Setup
    
    private func openDatabase() {
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        let dbPath = documentsPath.appendingPathComponent(dbName).path
        
        if sqlite3_open(dbPath, &db) != SQLITE_OK {
            print("Error opening database: \(String(cString: sqlite3_errmsg(db)))")
        }
    }
    
    private func createTables() {
        let createSQL = """
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            is_visible INTEGER DEFAULT 1,
            color TEXT NOT NULL,
            created_at TEXT NOT NULL,
            modified_at TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS layers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            geometry_type TEXT NOT NULL,
            color TEXT NOT NULL,
            opacity REAL DEFAULT 0.7,
            outline_width REAL DEFAULT 2.0,
            is_visible INTEGER DEFAULT 1,
            show_labels INTEGER DEFAULT 1,
            display_field TEXT DEFAULT 'name',
            project_id TEXT NOT NULL,
            geojson_data TEXT,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        );
        
        CREATE TABLE IF NOT EXISTS pins (
            id TEXT PRIMARY KEY,
            number INTEGER NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            altitude REAL,
            accuracy REAL NOT NULL,
            timestamp TEXT NOT NULL,
            note TEXT DEFAULT ''
        );
        
        CREATE TABLE IF NOT EXISTS tracks (
            id TEXT PRIMARY KEY,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            total_distance REAL NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS track_points (
            id TEXT PRIMARY KEY,
            track_id TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            altitude REAL,
            accuracy REAL NOT NULL,
            timestamp TEXT NOT NULL,
            sort_order INTEGER NOT NULL,
            FOREIGN KEY (track_id) REFERENCES tracks(id)
        );
        
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        """
        
        var errorMsg: UnsafeMutablePointer<Int8>?
        if sqlite3_exec(db, createSQL, nil, nil, &errorMsg) != SQLITE_OK {
            if let error = errorMsg {
                print("Table creation error: \(String(cString: error))")
                sqlite3_free(error)
            }
        }
    }
    
    // MARK: - Projects
    
    func loadProjects() {
        var stmt: OpaquePointer?
        let sql = "SELECT id, name, is_visible, color, created_at, modified_at FROM projects ORDER BY modified_at DESC"
        
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return }
        defer { sqlite3_finalize(stmt) }
        
        var results: [Project] = []
        let formatter = ISO8601DateFormatter()
        
        while sqlite3_step(stmt) == SQLITE_ROW {
            let id = UUID(uuidString: String(cString: sqlite3_column_text(stmt, 0))) ?? UUID()
            let name = String(cString: sqlite3_column_text(stmt, 1))
            let isVisible = sqlite3_column_int(stmt, 2) == 1
            let color = String(cString: sqlite3_column_text(stmt, 3))
            let createdAt = formatter.date(from: String(cString: sqlite3_column_text(stmt, 4))) ?? Date()
            let modifiedAt = formatter.date(from: String(cString: sqlite3_column_text(stmt, 5))) ?? Date()
            
            var project = Project(name: name, color: color)
            // Override with stored values
            project = Project(id: id, name: name, isVisible: isVisible, color: color, createdAt: createdAt, modifiedAt: modifiedAt)
            results.append(project)
        }
        
        projects = results
    }
    
    func saveProject(_ project: Project) {
        let sql = """
        INSERT OR REPLACE INTO projects (id, name, is_visible, color, created_at, modified_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """
        
        var stmt: OpaquePointer?
        let formatter = ISO8601DateFormatter()
        
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return }
        defer { sqlite3_finalize(stmt) }
        
        sqlite3_bind_text(stmt, 1, project.id.uuidString, -1, nil)
        sqlite3_bind_text(stmt, 2, project.name, -1, nil)
        sqlite3_bind_int(stmt, 3, project.isVisible ? 1 : 0)
        sqlite3_bind_text(stmt, 4, project.color, -1, nil)
        sqlite3_bind_text(stmt, 5, formatter.string(from: project.createdAt), -1, nil)
        sqlite3_bind_text(stmt, 6, formatter.string(from: project.modifiedAt), -1, nil)
        
        sqlite3_step(stmt)
        loadProjects()
    }
    
    func deleteProject(_ project: Project) {
        let sql = "DELETE FROM projects WHERE id = ?"
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return }
        defer { sqlite3_finalize(stmt) }
        sqlite3_bind_text(stmt, 1, project.id.uuidString, -1, nil)
        sqlite3_step(stmt)
        loadProjects()
    }
    
    // MARK: - Layers
    
    func loadLayers() {
        var stmt: OpaquePointer?
        let sql = "SELECT id, name, geometry_type, color, opacity, outline_width, is_visible, show_labels, display_field, project_id, geojson_data FROM layers"
        
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return }
        defer { sqlite3_finalize(stmt) }
        
        var results: [Layer] = []
        
        while sqlite3_step(stmt) == SQLITE_ROW {
            let id = UUID(uuidString: String(cString: sqlite3_column_text(stmt, 0))) ?? UUID()
            let name = String(cString: sqlite3_column_text(stmt, 1))
            let geometryTypeStr = String(cString: sqlite3_column_text(stmt, 2))
            let color = String(cString: sqlite3_column_text(stmt, 3))
            let opacity = sqlite3_column_double(stmt, 4)
            let outlineWidth = sqlite3_column_double(stmt, 5)
            let isVisible = sqlite3_column_int(stmt, 6) == 1
            let showLabels = sqlite3_column_int(stmt, 7) == 1
            let displayField = String(cString: sqlite3_column_text(stmt, 8))
            let projectId = UUID(uuidString: String(cString: sqlite3_column_text(stmt, 9))) ?? UUID()
            let geoJSON: String? = sqlite3_column_text(stmt, 10).map { String(cString: $0) }
            
            var layer = Layer(name: name, geometryType: GeometryType(rawValue: geometryTypeStr) ?? .polygon, color: color, projectId: projectId)
            layer.opacity = opacity
            layer.outlineWidth = outlineWidth
            layer.isVisible = isVisible
            layer.showLabels = showLabels
            layer.displayField = displayField
            layer.geoJSONData = geoJSON
            results.append(layer)
        }
        
        layers = results
    }
    
    func saveLayer(_ layer: Layer) {
        let sql = """
        INSERT OR REPLACE INTO layers (id, name, geometry_type, color, opacity, outline_width, is_visible, show_labels, display_field, project_id, geojson_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return }
        defer { sqlite3_finalize(stmt) }
        
        sqlite3_bind_text(stmt, 1, layer.id.uuidString, -1, nil)
        sqlite3_bind_text(stmt, 2, layer.name, -1, nil)
        sqlite3_bind_text(stmt, 3, layer.geometryType.rawValue, -1, nil)
        sqlite3_bind_text(stmt, 4, layer.color, -1, nil)
        sqlite3_bind_double(stmt, 5, layer.opacity)
        sqlite3_bind_double(stmt, 6, layer.outlineWidth)
        sqlite3_bind_int(stmt, 7, layer.isVisible ? 1 : 0)
        sqlite3_bind_int(stmt, 8, layer.showLabels ? 1 : 0)
        sqlite3_bind_text(stmt, 9, layer.displayField, -1, nil)
        sqlite3_bind_text(stmt, 10, layer.projectId.uuidString, -1, nil)
        if let geoJSON = layer.geoJSONData {
            sqlite3_bind_text(stmt, 11, geoJSON, -1, nil)
        } else {
            sqlite3_bind_null(stmt, 11)
        }
        
        sqlite3_step(stmt)
        loadLayers()
    }
    
    func deleteLayer(_ layer: Layer) {
        let sql = "DELETE FROM layers WHERE id = ?"
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return }
        defer { sqlite3_finalize(stmt) }
        sqlite3_bind_text(stmt, 1, layer.id.uuidString, -1, nil)
        sqlite3_step(stmt)
        loadLayers()
    }
    
    func layers(for project: Project) -> [Layer] {
        layers.filter { $0.projectId == project.id }
    }
    
    // MARK: - Pins
    
    func savePins(_ pins: [Pin]) {
        let sql = "DELETE FROM pins"
        sqlite3_exec(db, sql, nil, nil, nil)
        
        let insertSQL = "INSERT INTO pins (id, number, latitude, longitude, altitude, accuracy, timestamp, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, insertSQL, -1, &stmt, nil) == SQLITE_OK else { return }
        defer { sqlite3_finalize(stmt) }
        
        let formatter = ISO8601DateFormatter()
        
        for pin in pins {
            sqlite3_bind_text(stmt, 1, pin.id.uuidString, -1, nil)
            sqlite3_bind_int(stmt, 2, Int32(pin.number))
            sqlite3_bind_double(stmt, 3, pin.coordinate.latitude)
            sqlite3_bind_double(stmt, 4, pin.coordinate.longitude)
            if let alt = pin.altitude {
                sqlite3_bind_double(stmt, 5, alt)
            } else {
                sqlite3_bind_null(stmt, 5)
            }
            sqlite3_bind_double(stmt, 6, pin.accuracy)
            sqlite3_bind_text(stmt, 7, formatter.string(from: pin.timestamp), -1, nil)
            sqlite3_bind_text(stmt, 8, pin.note, -1, nil)
            sqlite3_step(stmt)
            sqlite3_reset(stmt)
        }
    }
    
    func loadPins() -> [Pin] {
        var stmt: OpaquePointer?
        let sql = "SELECT id, number, latitude, longitude, altitude, accuracy, timestamp, note FROM pins ORDER BY number"
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return [] }
        defer { sqlite3_finalize(stmt) }
        
        let formatter = ISO8601DateFormatter()
        var results: [Pin] = []
        
        while sqlite3_step(stmt) == SQLITE_ROW {
            let lat = sqlite3_column_double(stmt, 2)
            let lon = sqlite3_column_double(stmt, 3)
            let coordinate = CLLocationCoordinate2D(latitude: lat, longitude: lon)
            let number = Int(sqlite3_column_int(stmt, 1))
            let altitude: Double? = sqlite3_column_type(stmt, 4) == SQLITE_NULL ? nil : sqlite3_column_double(stmt, 4)
            let accuracy = sqlite3_column_double(stmt, 5)
            let timestamp = formatter.date(from: String(cString: sqlite3_column_text(stmt, 6))) ?? Date()
            let note = String(cString: sqlite3_column_text(stmt, 7))
            
            let pin = Pin(number: number, coordinate: coordinate, altitude: altitude, accuracy: accuracy, timestamp: timestamp, note: note)
            results.append(pin)
        }
        
        return results
    }
    
    // MARK: - Settings
    
    func getSetting(_ key: String) -> String? {
        var stmt: OpaquePointer?
        let sql = "SELECT value FROM settings WHERE key = ?"
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return nil }
        defer { sqlite3_finalize(stmt) }
        sqlite3_bind_text(stmt, 1, key, -1, nil)
        if sqlite3_step(stmt) == SQLITE_ROW {
            return String(cString: sqlite3_column_text(stmt, 0))
        }
        return nil
    }
    
    func setSetting(_ key: String, value: String) {
        let sql = "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)"
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return }
        defer { sqlite3_finalize(stmt) }
        sqlite3_bind_text(stmt, 1, key, -1, nil)
        sqlite3_bind_text(stmt, 2, value, -1, nil)
        sqlite3_step(stmt)
    }
}

// Extension to create Project with explicit ID (for loading from DB)
extension Project {
    init(id: UUID, name: String, isVisible: Bool, color: String, createdAt: Date, modifiedAt: Date) {
        self.id = id
        self.name = name
        self.isVisible = isVisible
        self.color = color
        self.createdAt = createdAt
        self.modifiedAt = modifiedAt
    }
}

import CoreLocation
