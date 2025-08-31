// Top-level build file where you can add configuration options common to all sub-projects/modules.
buildscript {
    repositories {
        mavenCentral()
        gradlePluginPortal()
    }
    dependencies {
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.10")
        classpath("org.jetbrains.kotlin:kotlin-serialization:1.9.10")
        classpath("org.jlleitschuh.gradle:ktlint-gradle:11.3.2")
        classpath("io.gitlab.arturbosch.detekt:detekt-gradle-plugin:1.23.1")
    }
}