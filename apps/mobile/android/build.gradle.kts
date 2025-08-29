// Top-level build file where you can add configuration options common to all sub-projects/modules.
buildscript {
    repositories {
        mavenCentral()
        gradlePluginPortal()
        // Remove google() dependency for now due to network restrictions
    }
    dependencies {
        // Use versions available from mavenCentral/gradlePluginPortal only
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.10")
        classpath("org.jlleitschuh.gradle:ktlint-gradle:11.3.2")
        classpath("io.gitlab.arturbosch.detekt:detekt-gradle-plugin:1.23.1")
        // Remove Android Gradle Plugin temporarily due to network restrictions
        // classpath("com.android.tools.build:gradle:8.1.4")
    }
}