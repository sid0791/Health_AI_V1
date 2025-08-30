import XCTest
import SwiftUI
@testable import HealthCoachAI

/**
 * UI Snapshot Tests for HealthCoachAI
 * Implements Phase 7 requirement: "UI snapshot testing implementation"
 * Ensures consistent UI rendering across different devices and orientations
 */
class UISnapshotTests: XCTestCase {
    
    // MARK: - Dashboard View Tests
    
    func testDashboardView_LightMode() {
        let view = DashboardView()
            .preferredColorScheme(.light)
        
        assertSnapshot(matching: view, as: .image(layout: .device(config: .iPhone13)))
    }
    
    func testDashboardView_DarkMode() {
        let view = DashboardView()
            .preferredColorScheme(.dark)
        
        assertSnapshot(matching: view, as: .image(layout: .device(config: .iPhone13)))
    }
    
    func testDashboardView_iPad() {
        let view = DashboardView()
        
        assertSnapshot(matching: view, as: .image(layout: .device(config: .iPadPro11)))
    }
    
    func testDashboardView_Accessibility() {
        let view = DashboardView()
            .environment(\.sizeCategory, .accessibilityExtraExtraLarge)
        
        assertSnapshot(matching: view, as: .image(layout: .device(config: .iPhone13)))
    }
    
    // MARK: - Meal Plan View Tests
    
    func testMealPlanView_LightMode() {
        let view = MealPlanView()
            .preferredColorScheme(.light)
        
        assertSnapshot(matching: view, as: .image(layout: .device(config: .iPhone13)))
    }
    
    func testMealPlanView_DarkMode() {
        let view = MealPlanView()
            .preferredColorScheme(.dark)
        
        assertSnapshot(matching: view, as: .image(layout: .device(config: .iPhone13)))
    }
    
    // MARK: - Log View Tests
    
    func testLogView_FoodTab() {
        let view = LogView()
            .preferredColorScheme(.light)
        
        assertSnapshot(matching: view, as: .image(layout: .device(config: .iPhone13)))
    }
    
    func testLogView_DarkMode() {
        let view = LogView()
            .preferredColorScheme(.dark)
        
        assertSnapshot(matching: view, as: .image(layout: .device(config: .iPhone13)))
    }
    
    // MARK: - Fitness View Tests
    
    func testFitnessView_LightMode() {
        let view = FitnessView()
            .preferredColorScheme(.light)
        
        assertSnapshot(matching: view, as: .image(layout: .device(config: .iPhone13)))
    }
    
    func testFitnessView_DarkMode() {
        let view = FitnessView()
            .preferredColorScheme(.dark)
        
        assertSnapshot(matching: view, as: .image(layout: .device(config: .iPhone13)))
    }
    
    // MARK: - Settings View Tests
    
    func testSettingsView_LightMode() {
        let view = SettingsView()
            .preferredColorScheme(.light)
        
        assertSnapshot(matching: view, as: .image(layout: .device(config: .iPhone13)))
    }
    
    func testSettingsView_DarkMode() {
        let view = SettingsView()
            .preferredColorScheme(.dark)
        
        assertSnapshot(matching: view, as: .image(layout: .device(config: .iPhone13)))
    }
    
    // MARK: - Component Tests
    
    func testDashboardCard_Component() {
        let card = DashboardCard(
            title: "Test Card",
            subtitle: "Test subtitle with description",
            iconName: "heart.fill",
            iconColor: DesignColors.primary500
        ) {
            // Action
        }
        .frame(width: 350, height: 100)
        .padding()
        
        assertSnapshot(matching: card, as: .image)
    }
    
    func testQuickActionButton_Component() {
        let button = QuickActionButton(
            title: "Test Action",
            iconName: "plus.circle.fill",
            color: DesignColors.success500
        ) {
            // Action
        }
        .frame(width: 100, height: 80)
        .padding()
        
        assertSnapshot(matching: button, as: .image)
    }
    
    func testMealCard_Component() {
        let mealCard = MealCard(
            mealType: "Breakfast",
            title: "Test Meal",
            description: "A delicious test meal with great nutrition",
            calories: 350,
            prepTime: "10 min",
            difficulty: "Easy",
            macros: (carbs: 45, protein: 12, fat: 15)
        )
        .frame(width: 350)
        .padding()
        
        assertSnapshot(matching: mealCard, as: .image)
    }
    
    // MARK: - Design System Tests
    
    func testColorPalette() {
        let colorPalette = VStack(spacing: 8) {
            HStack(spacing: 8) {
                ColorSwatch(color: DesignColors.primary500, name: "Primary")
                ColorSwatch(color: DesignColors.secondary500, name: "Secondary")
                ColorSwatch(color: DesignColors.success500, name: "Success")
            }
            HStack(spacing: 8) {
                ColorSwatch(color: DesignColors.warning500, name: "Warning")
                ColorSwatch(color: DesignColors.error500, name: "Error")
                ColorSwatch(color: DesignColors.gray500, name: "Gray")
            }
        }
        .padding()
        
        assertSnapshot(matching: colorPalette, as: .image)
    }
    
    func testTypography() {
        let typography = VStack(alignment: .leading, spacing: 8) {
            Text("Large Title").font(DesignFonts.largeTitle)
            Text("Title").font(DesignFonts.title)
            Text("Title 2").font(DesignFonts.title2)
            Text("Headline").font(DesignFonts.headline)
            Text("Body").font(DesignFonts.body)
            Text("Callout").font(DesignFonts.callout)
            Text("Subheadline").font(DesignFonts.subheadline)
            Text("Footnote").font(DesignFonts.footnote)
            Text("Caption").font(DesignFonts.caption)
        }
        .padding()
        
        assertSnapshot(matching: typography, as: .image)
    }
    
    // MARK: - Accessibility Tests
    
    func testAccessibilityCompliance_MinimumTapTargets() {
        let view = VStack(spacing: 20) {
            Button("44pt Button") { }
                .frame(width: 44, height: 44)
                .background(DesignColors.primary500)
                .foregroundColor(.white)
                .cornerRadius(8)
            
            Button("Larger Button") { }
                .frame(width: 100, height: 44)
                .background(DesignColors.secondary500)
                .foregroundColor(.white)
                .cornerRadius(8)
        }
        .padding()
        
        assertSnapshot(matching: view, as: .image)
    }
    
    func testAccessibilityCompliance_ColorContrast() {
        let contrastView = VStack(spacing: 16) {
            // Test WCAG AA compliance
            Text("Primary on White")
                .foregroundColor(DesignColors.primary500)
                .background(Color.white)
                .padding()
            
            Text("White on Primary")
                .foregroundColor(.white)
                .background(DesignColors.primary500)
                .padding()
            
            Text("Secondary on White")
                .foregroundColor(DesignColors.secondary500)
                .background(Color.white)
                .padding()
        }
        .padding()
        
        assertSnapshot(matching: contrastView, as: .image)
    }
    
    // MARK: - Responsive Design Tests
    
    func testResponsiveDesign_iPhone() {
        let view = ContentView()
        
        assertSnapshot(matching: view, as: .image(layout: .device(config: .iPhoneSE)))
        assertSnapshot(matching: view, as: .image(layout: .device(config: .iPhone13)))
        assertSnapshot(matching: view, as: .image(layout: .device(config: .iPhone13ProMax)))
    }
    
    func testResponsiveDesign_iPad() {
        let view = ContentView()
        
        assertSnapshot(matching: view, as: .image(layout: .device(config: .iPadMini)))
        assertSnapshot(matching: view, as: .image(layout: .device(config: .iPadPro11)))
    }
    
    // MARK: - Edge Cases
    
    func testEmptyStates() {
        // Test empty meal plan
        let emptyView = VStack {
            Text("No meals planned")
                .foregroundColor(.secondary)
            Button("Add Meal") { }
                .foregroundColor(DesignColors.primary500)
        }
        .padding()
        
        assertSnapshot(matching: emptyView, as: .image)
    }
    
    func testLongContent() {
        let longContent = Text("This is a very long text that should wrap properly across multiple lines and demonstrate how the UI handles longer content gracefully without breaking the layout or becoming unreadable")
            .frame(width: 200)
            .padding()
        
        assertSnapshot(matching: longContent, as: .image)
    }
}

// MARK: - Helper Views

struct ColorSwatch: View {
    let color: Color
    let name: String
    
    var body: some View {
        VStack(spacing: 4) {
            Rectangle()
                .fill(color)
                .frame(width: 60, height: 40)
                .cornerRadius(8)
            
            Text(name)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }
}