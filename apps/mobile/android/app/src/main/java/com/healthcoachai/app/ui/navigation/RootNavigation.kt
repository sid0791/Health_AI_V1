package com.healthcoachai.app.ui.navigation

import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.healthcoachai.app.auth.AuthenticationService
import com.healthcoachai.app.auth.ui.LoginScreen

/**
 * Root navigation that handles authentication flow
 */
@Composable
fun RootNavigation() {
    val context = LocalContext.current
    val navController = rememberNavController()
    val authService = remember { AuthenticationService(context) }
    
    // Check authentication status
    var isAuthenticated by remember { mutableStateOf(authService.isLoggedIn()) }
    
    NavHost(
        navController = navController,
        startDestination = if (isAuthenticated) "main" else "login"
    ) {
        composable("login") {
            LoginScreen(
                onLoginSuccess = {
                    isAuthenticated = true
                    navController.navigate("main") {
                        popUpTo("login") { inclusive = true }
                    }
                }
            )
        }
        
        composable("main") {
            MainNavigation(
                onLogout = {
                    // Handle logout
                    isAuthenticated = false
                    navController.navigate("login") {
                        popUpTo("main") { inclusive = true }
                    }
                }
            )
        }
    }
}