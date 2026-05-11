import SwiftUI

/// Reusable screen header with back button and optional trailing action
struct ScreenHeader<TrailingContent: View>: View {
    let title: String
    let onBack: () -> Void
    let trailing: TrailingContent
    
    init(title: String, onBack: @escaping () -> Void, @ViewBuilder trailing: () -> TrailingContent) {
        self.title = title
        self.onBack = onBack
        self.trailing = trailing()
    }
    
    var body: some View {
        HStack(spacing: 12) {
            Button(action: onBack) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Color(hex: "#1C4A50"))
                    .frame(width: 36, height: 36)
                    .background(Color(hex: "#E4EAEA"))
                    .clipShape(Circle())
            }
            
            Text(title)
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(Color(hex: "#1C4A50"))
            
            Spacer()
            
            trailing
        }
        .padding(.horizontal, 20)
        .padding(.top, 60) // Status bar clearance
        .padding(.bottom, 16)
        .background(Color.white)
        .overlay(
            Rectangle().fill(Color(hex: "#D5DEDE")).frame(height: 1),
            alignment: .bottom
        )
    }
}

// Convenience init without trailing content
extension ScreenHeader where TrailingContent == EmptyView {
    init(title: String, onBack: @escaping () -> Void) {
        self.title = title
        self.onBack = onBack
        self.trailing = EmptyView()
    }
}

/// Section label used in list screens
struct SectionLabel: View {
    let text: String
    
    var body: some View {
        Text(text)
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(Color(hex: "#9AAFAF"))
            .textCase(.uppercase)
            .tracking(0.5)
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 4)
    }
}
