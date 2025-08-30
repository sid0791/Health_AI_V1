pluginManagement {
    repositories {
        mavenCentral()
        gradlePluginPortal()
        // Remove google() dependency for now due to network restrictions
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        mavenCentral()
        // Remove google() dependency for now due to network restrictions  
    }
}

rootProject.name = "HealthCoachAI"
include(":app")