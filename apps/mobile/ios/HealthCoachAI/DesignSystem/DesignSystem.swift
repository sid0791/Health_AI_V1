import SwiftUI

// MARK: - Color Extensions
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Design System Colors
struct DesignColors {
    // Primary Brand Colors (Turquoise)
    static let primary50 = Color(hex: "#f0fdfa")
    static let primary100 = Color(hex: "#ccfbf1")
    static let primary200 = Color(hex: "#99f6e4")
    static let primary300 = Color(hex: "#5eead4")
    static let primary400 = Color(hex: "#2dd4bf")
    static let primary500 = Color(hex: "#14b8a6") // Main brand color
    static let primary600 = Color(hex: "#0d9488")
    static let primary700 = Color(hex: "#0f766e")
    static let primary800 = Color(hex: "#115e59")
    static let primary900 = Color(hex: "#134e4a")
    
    // Secondary Brand Colors (Coral)
    static let secondary50 = Color(hex: "#fef7ee")
    static let secondary100 = Color(hex: "#fedfc7")
    static let secondary200 = Color(hex: "#fdba8c")
    static let secondary300 = Color(hex: "#fb923c")
    static let secondary400 = Color(hex: "#f97316")
    static let secondary500 = Color(hex: "#f0653e") // Accent color
    static let secondary600 = Color(hex: "#ea580c")
    static let secondary700 = Color(hex: "#c2410c")
    static let secondary800 = Color(hex: "#9a3412")
    static let secondary900 = Color(hex: "#7c2d12")
    
    // Success Colors (Green)
    static let success50 = Color(hex: "#f0fdf4")
    static let success100 = Color(hex: "#dcfce7")
    static let success200 = Color(hex: "#bbf7d0")
    static let success300 = Color(hex: "#86efac")
    static let success400 = Color(hex: "#4ade80")
    static let success500 = Color(hex: "#22c55e")
    static let success600 = Color(hex: "#16a34a")
    static let success700 = Color(hex: "#15803d")
    static let success800 = Color(hex: "#166534")
    static let success900 = Color(hex: "#14532d")
    
    // Warning Colors (Yellow)
    static let warning50 = Color(hex: "#fefce8")
    static let warning100 = Color(hex: "#fef3c7")
    static let warning200 = Color(hex: "#fde68a")
    static let warning300 = Color(hex: "#fcd34d")
    static let warning400 = Color(hex: "#fbbf24")
    static let warning500 = Color(hex: "#f59e0b")
    static let warning600 = Color(hex: "#d97706")
    static let warning700 = Color(hex: "#b45309")
    static let warning800 = Color(hex: "#92400e")
    static let warning900 = Color(hex: "#78350f")
    
    // Error Colors (Red)
    static let error50 = Color(hex: "#fef2f2")
    static let error100 = Color(hex: "#fee2e2")
    static let error200 = Color(hex: "#fecaca")
    static let error300 = Color(hex: "#fca5a5")
    static let error400 = Color(hex: "#f87171")
    static let error500 = Color(hex: "#ef4444")
    static let error600 = Color(hex: "#dc2626")
    static let error700 = Color(hex: "#b91c1c")
    static let error800 = Color(hex: "#991b1b")
    static let error900 = Color(hex: "#7f1d1d")
    
    // Gray Colors
    static let gray50 = Color(hex: "#f9fafb")
    static let gray100 = Color(hex: "#f3f4f6")
    static let gray200 = Color(hex: "#e5e7eb")
    static let gray300 = Color(hex: "#d1d5db")
    static let gray400 = Color(hex: "#9ca3af")
    static let gray500 = Color(hex: "#6b7280")
    static let gray600 = Color(hex: "#4b5563")
    static let gray700 = Color(hex: "#374151")
    static let gray800 = Color(hex: "#1f2937")
    static let gray900 = Color(hex: "#111827")
}

// MARK: - Typography
struct DesignFonts {
    // Inter/Poppins font family would be configured here
    // For now using system fonts with similar characteristics
    
    static let largeTitle = Font.largeTitle.weight(.bold)
    static let title = Font.title.weight(.semibold)
    static let title2 = Font.title2.weight(.semibold)
    static let title3 = Font.title3.weight(.medium)
    static let headline = Font.headline.weight(.semibold)
    static let body = Font.body
    static let callout = Font.callout
    static let subheadline = Font.subheadline
    static let footnote = Font.footnote
    static let caption = Font.caption
    static let caption2 = Font.caption2
}

// MARK: - Spacing
struct DesignSpacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
    static let xxl: CGFloat = 48
    static let xxxl: CGFloat = 64
}

// MARK: - Border Radius
struct DesignRadius {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let full: CGFloat = 9999
}

// MARK: - Shadows
struct DesignShadows {
    static let sm = Color.black.opacity(0.05)
    static let md = Color.black.opacity(0.1)
    static let lg = Color.black.opacity(0.15)
    static let xl = Color.black.opacity(0.2)
}

// MARK: - Accessibility Constants
struct DesignAccessibility {
    static let minTapTarget: CGFloat = 44 // WCAG AA minimum
    static let focusRingWidth: CGFloat = 2
    static let focusRingOffset: CGFloat = 2
    
    // Animation duration constants
    static let animationFast: Double = 0.15
    static let animationNormal: Double = 0.25
    static let animationSlow: Double = 0.35
}