import SwiftUI
import Combine

/**
 * Performance Manager for HealthCoachAI iOS App
 * Implements Phase 7 requirement: "Performance optimization (60fps targets)"
 * Monitors and optimizes app performance to maintain 60fps
 */
class PerformanceManager: ObservableObject {
    static let shared = PerformanceManager()
    
    @Published var currentFPS: Double = 60.0
    @Published var averageFPS: Double = 60.0
    @Published var performanceState: PerformanceState = .optimal
    
    private var displayLink: CADisplayLink?
    private var frameTimestamps: [CFTimeInterval] = []
    private let maxFrameHistory = 60 // Keep 1 second of frame data at 60fps
    private var cancellables = Set<AnyCancellable>()
    
    private init() {
        startPerformanceMonitoring()
    }
    
    // MARK: - Performance Monitoring
    
    private func startPerformanceMonitoring() {
        displayLink = CADisplayLink(target: self, selector: #selector(updateFPS))
        displayLink?.add(to: .main, forMode: .common)
        
        // Monitor performance state every 2 seconds
        Timer.publish(every: 2.0, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.updatePerformanceState()
            }
            .store(in: &cancellables)
    }
    
    @objc private func updateFPS() {
        let timestamp = CACurrentMediaTime()
        frameTimestamps.append(timestamp)
        
        // Keep only recent frames
        if frameTimestamps.count > maxFrameHistory {
            frameTimestamps.removeFirst()
        }
        
        // Calculate FPS based on recent frames
        if frameTimestamps.count > 1 {
            let timeDiff = frameTimestamps.last! - frameTimestamps.first!
            let fps = Double(frameTimestamps.count - 1) / timeDiff
            
            DispatchQueue.main.async {
                self.currentFPS = fps
                self.updateAverageFPS()
            }
        }
    }
    
    private func updateAverageFPS() {
        // Simple exponential moving average
        averageFPS = (averageFPS * 0.9) + (currentFPS * 0.1)
    }
    
    private func updatePerformanceState() {
        if averageFPS >= 55 {
            performanceState = .optimal
        } else if averageFPS >= 45 {
            performanceState = .good
        } else if averageFPS >= 30 {
            performanceState = .acceptable
        } else {
            performanceState = .poor
        }
    }
    
    // MARK: - Performance Optimization
    
    func optimizeForCurrentState() {
        switch performanceState {
        case .optimal:
            // Enable all visual effects
            enableHighQualityRendering()
        case .good:
            // Slight reduction in effects
            reduceNonEssentialAnimations()
        case .acceptable:
            // Significant reduction in visual effects
            enablePerformanceMode()
        case .poor:
            // Minimal visual effects
            enableLowPowerMode()
        }
    }
    
    private func enableHighQualityRendering() {
        // Enable all animations and effects
        NotificationCenter.default.post(name: .performanceOptimization, object: PerformanceSettings.highQuality)
    }
    
    private func reduceNonEssentialAnimations() {
        // Reduce some animation durations
        NotificationCenter.default.post(name: .performanceOptimization, object: PerformanceSettings.reduced)
    }
    
    private func enablePerformanceMode() {
        // Disable some animations and effects
        NotificationCenter.default.post(name: .performanceOptimization, object: PerformanceSettings.performance)
    }
    
    private func enableLowPowerMode() {
        // Minimal animations and effects
        NotificationCenter.default.post(name: .performanceOptimization, object: PerformanceSettings.lowPower)
    }
    
    // MARK: - Memory Management
    
    func clearCaches() {
        // Clear image caches
        ImageCache.shared.clearCache()
        
        // Clear data caches
        URLCache.shared.removeAllCachedResponses()
        
        // Trigger garbage collection
        DispatchQueue.global(qos: .utility).async {
            // Force garbage collection
            autoreleasepool { }
        }
    }
    
    func getMemoryUsage() -> MemoryUsage {
        var info = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size) / 4

        let result = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &count)
            }
        }

        if result == KERN_SUCCESS {
            let usedMB = Double(info.resident_size) / 1024.0 / 1024.0
            let totalMB = Double(ProcessInfo.processInfo.physicalMemory) / 1024.0 / 1024.0
            
            return MemoryUsage(used: usedMB, total: totalMB)
        }
        
        return MemoryUsage(used: 0, total: 0)
    }
    
    deinit {
        displayLink?.invalidate()
    }
}

// MARK: - Supporting Types

enum PerformanceState {
    case optimal    // 55+ fps
    case good       // 45-55 fps  
    case acceptable // 30-45 fps
    case poor       // <30 fps
    
    var description: String {
        switch self {
        case .optimal: return "Optimal"
        case .good: return "Good"
        case .acceptable: return "Acceptable"
        case .poor: return "Poor"
        }
    }
    
    var color: Color {
        switch self {
        case .optimal: return DesignColors.success500
        case .good: return DesignColors.success400
        case .acceptable: return DesignColors.warning500
        case .poor: return DesignColors.error500
        }
    }
}

struct PerformanceSettings {
    static let highQuality = PerformanceSettings(
        animationDuration: DesignAccessibility.animationNormal,
        enableShadows: true,
        enableBlur: true,
        enableTransitions: true
    )
    
    static let reduced = PerformanceSettings(
        animationDuration: DesignAccessibility.animationFast,
        enableShadows: true,
        enableBlur: false,
        enableTransitions: true
    )
    
    static let performance = PerformanceSettings(
        animationDuration: DesignAccessibility.animationFast,
        enableShadows: false,
        enableBlur: false,
        enableTransitions: false
    )
    
    static let lowPower = PerformanceSettings(
        animationDuration: 0.05,
        enableShadows: false,
        enableBlur: false,
        enableTransitions: false
    )
    
    let animationDuration: Double
    let enableShadows: Bool
    let enableBlur: Bool
    let enableTransitions: Bool
}

struct MemoryUsage {
    let used: Double // MB
    let total: Double // MB
    
    var percentage: Double {
        return total > 0 ? (used / total) * 100 : 0
    }
}

// MARK: - Image Cache

class ImageCache {
    static let shared = ImageCache()
    private let cache = NSCache<NSString, UIImage>()
    
    private init() {
        cache.countLimit = 100
        cache.totalCostLimit = 50 * 1024 * 1024 // 50MB
    }
    
    func setImage(_ image: UIImage, forKey key: String) {
        cache.setObject(image, forKey: key as NSString)
    }
    
    func image(forKey key: String) -> UIImage? {
        return cache.object(forKey: key as NSString)
    }
    
    func clearCache() {
        cache.removeAllObjects()
    }
}

// MARK: - Notifications

extension Notification.Name {
    static let performanceOptimization = Notification.Name("performanceOptimization")
}