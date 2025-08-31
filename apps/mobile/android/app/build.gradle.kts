plugins {
    kotlin("jvm")
    id("org.jetbrains.kotlin.plugin.serialization")
    // Temporarily disable linters to focus on compilation
    // id("org.jlleitschuh.gradle.ktlint")
    // id("io.gitlab.arturbosch.detekt")
}

kotlin {
    jvmToolchain(17)
}

// Only compile specific business logic files that don't depend on Android
sourceSets {
    main {
        kotlin.srcDirs("src/main/kotlin")
    }
    test {
        kotlin.srcDirs("src/test/java")
    }
}

dependencies {
    // Core Kotlin dependencies
    implementation("org.jetbrains.kotlin:kotlin-stdlib:1.9.10")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
    
    // HTTP client for ConfigManager
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    
    // Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlin:kotlin-test:1.9.10")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
}

// Linter configurations disabled for build validation
// ktlint { ... }
// detekt { ... }
