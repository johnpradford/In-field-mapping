// swift-tools-version: 5.9
// NOTE FOR DEVELOPER:
// This Package.swift defines the MapLibre dependency.
// In Xcode, add this as a Swift Package dependency:
//   File > Add Package Dependencies > paste the URL below
//
// Alternatively, add it via the project's Package Dependencies tab.

import PackageDescription

let package = Package(
    name: "Fieldmap",
    platforms: [.iOS(.v16)],
    dependencies: [
        // MapLibre GL Native for iOS
        // https://github.com/maplibre/maplibre-gl-native-distribution
        .package(url: "https://github.com/maplibre/maplibre-gl-native-distribution.git", from: "6.0.0"),
    ],
    targets: [
        .target(
            name: "Fieldmap",
            dependencies: [
                .product(name: "MapLibre", package: "maplibre-gl-native-distribution"),
            ]
        ),
    ]
)
