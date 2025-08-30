package com.healthcoachai.app.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val DarkColorScheme = darkColorScheme(
    primary = Primary400,
    onPrimary = Primary900,
    primaryContainer = Primary700,
    onPrimaryContainer = Primary100,
    secondary = Secondary400,
    onSecondary = Secondary900,
    secondaryContainer = Secondary700,
    onSecondaryContainer = Secondary100,
    tertiary = Success400,
    onTertiary = Success900,
    tertiaryContainer = Success700,
    onTertiaryContainer = Success100,
    error = Error400,
    onError = Error900,
    errorContainer = Error700,
    onErrorContainer = Error100,
    background = Gray900,
    onBackground = Gray100,
    surface = Gray800,
    onSurface = Gray100,
    surfaceVariant = Gray700,
    onSurfaceVariant = Gray300,
    outline = Gray500,
    inverseSurface = Gray100,
    inverseOnSurface = Gray800,
    inversePrimary = Primary600,
    surfaceTint = Primary400
)

private val LightColorScheme = lightColorScheme(
    primary = Primary500,
    onPrimary = Color.White,
    primaryContainer = Primary100,
    onPrimaryContainer = Primary900,
    secondary = Secondary500,
    onSecondary = Color.White,
    secondaryContainer = Secondary100,
    onSecondaryContainer = Secondary900,
    tertiary = Success500,
    onTertiary = Color.White,
    tertiaryContainer = Success100,
    onTertiaryContainer = Success900,
    error = Error500,
    onError = Color.White,
    errorContainer = Error100,
    onErrorContainer = Error900,
    background = Gray50,
    onBackground = Gray900,
    surface = Color.White,
    onSurface = Gray900,
    surfaceVariant = Gray100,
    onSurfaceVariant = Gray700,
    outline = Gray400,
    inverseSurface = Gray800,
    inverseOnSurface = Gray100,
    inversePrimary = Primary200,
    surfaceTint = Primary500
)

@Composable
fun HealthCoachAITheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    // Dynamic color is available on Android 12+
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }

        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}