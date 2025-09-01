package com.healthcoachai.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.healthcoachai.app.ui.theme.HealthCoachAITheme
import com.healthcoachai.app.ui.navigation.RootNavigation

/**
 * MainActivity - Main entry point for the HealthCoachAI Android app
 * Implements Phase 7 requirements with Jetpack Compose navigation
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        
        setContent {
            HealthCoachAITheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    RootNavigation()
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun MainPreview() {
    HealthCoachAITheme {
        RootNavigation()
    }
}
