package com.healthcoachai.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.healthcoachai.app.ui.theme.*

// Data classes for settings
data class SettingsSection(
    val title: String,
    val items: List<SettingsItem>
)

data class SettingsItem(
    val title: String,
    val subtitle: String? = null,
    val icon: ImageVector,
    val action: SettingsAction,
    val hasSwitch: Boolean = false,
    val switchValue: Boolean = false,
    val hasArrow: Boolean = true
)

sealed class SettingsAction {
    object Navigate : SettingsAction()
    object Toggle : SettingsAction()
    object Dialog : SettingsAction()
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen() {
    var notificationsEnabled by remember { mutableStateOf(true) }
    var darkModeEnabled by remember { mutableStateOf(false) }
    var biometricEnabled by remember { mutableStateOf(true) }
    var autoSyncEnabled by remember { mutableStateOf(true) }
    
    val settingsSections = listOf(
        SettingsSection(
            title = "Profile",
            items = listOf(
                SettingsItem(
                    title = "Personal Information",
                    subtitle = "Age, height, weight, goals",
                    icon = Icons.Default.Person,
                    action = SettingsAction.Navigate
                ),
                SettingsItem(
                    title = "Health Conditions",
                    subtitle = "Medical conditions, allergies",
                    icon = Icons.Default.MedicalServices,
                    action = SettingsAction.Navigate
                ),
                SettingsItem(
                    title = "Food Preferences",
                    subtitle = "Diet type, cuisines, restrictions",
                    icon = Icons.Default.Restaurant,
                    action = SettingsAction.Navigate
                )
            )
        ),
        SettingsSection(
            title = "Notifications",
            items = listOf(
                SettingsItem(
                    title = "Push Notifications",
                    subtitle = "Meal reminders, workout alerts",
                    icon = Icons.Default.Notifications,
                    action = SettingsAction.Toggle,
                    hasSwitch = true,
                    switchValue = notificationsEnabled,
                    hasArrow = false
                ),
                SettingsItem(
                    title = "Email Notifications",
                    subtitle = "Weekly reports, tips",
                    icon = Icons.Default.Email,
                    action = SettingsAction.Navigate
                ),
                SettingsItem(
                    title = "Reminder Times",
                    subtitle = "Customize meal and workout reminders",
                    icon = Icons.Default.Schedule,
                    action = SettingsAction.Navigate
                )
            )
        ),
        SettingsSection(
            title = "Privacy & Security",
            items = listOf(
                SettingsItem(
                    title = "Biometric Authentication",
                    subtitle = "Use fingerprint or face unlock",
                    icon = Icons.Default.Fingerprint,
                    action = SettingsAction.Toggle,
                    hasSwitch = true,
                    switchValue = biometricEnabled,
                    hasArrow = false
                ),
                SettingsItem(
                    title = "Data Export",
                    subtitle = "Download your health data",
                    icon = Icons.Default.Download,
                    action = SettingsAction.Navigate
                ),
                SettingsItem(
                    title = "Privacy Settings",
                    subtitle = "Control data sharing",
                    icon = Icons.Default.Security,
                    action = SettingsAction.Navigate
                ),
                SettingsItem(
                    title = "Delete Account",
                    subtitle = "Permanently delete your data",
                    icon = Icons.Default.DeleteForever,
                    action = SettingsAction.Dialog
                )
            )
        ),
        SettingsSection(
            title = "App Preferences",
            items = listOf(
                SettingsItem(
                    title = "Dark Mode",
                    subtitle = "Switch to dark theme",
                    icon = Icons.Default.DarkMode,
                    action = SettingsAction.Toggle,
                    hasSwitch = true,
                    switchValue = darkModeEnabled,
                    hasArrow = false
                ),
                SettingsItem(
                    title = "Auto Sync",
                    subtitle = "Sync with health apps",
                    icon = Icons.Default.Sync,
                    action = SettingsAction.Toggle,
                    hasSwitch = true,
                    switchValue = autoSyncEnabled,
                    hasArrow = false
                ),
                SettingsItem(
                    title = "Language",
                    subtitle = "English (US)",
                    icon = Icons.Default.Language,
                    action = SettingsAction.Navigate
                ),
                SettingsItem(
                    title = "Units",
                    subtitle = "Metric (kg, cm)",
                    icon = Icons.Default.Straighten,
                    action = SettingsAction.Navigate
                )
            )
        ),
        SettingsSection(
            title = "Support",
            items = listOf(
                SettingsItem(
                    title = "Help Center",
                    subtitle = "FAQs and guides",
                    icon = Icons.Default.Help,
                    action = SettingsAction.Navigate
                ),
                SettingsItem(
                    title = "Contact Support",
                    subtitle = "Get help from our team",
                    icon = Icons.Default.Support,
                    action = SettingsAction.Navigate
                ),
                SettingsItem(
                    title = "Send Feedback",
                    subtitle = "Help us improve the app",
                    icon = Icons.Default.Feedback,
                    action = SettingsAction.Navigate
                ),
                SettingsItem(
                    title = "Rate the App",
                    subtitle = "Leave a review",
                    icon = Icons.Default.Star,
                    action = SettingsAction.Navigate
                )
            )
        ),
        SettingsSection(
            title = "About",
            items = listOf(
                SettingsItem(
                    title = "Terms of Service",
                    icon = Icons.Default.Description,
                    action = SettingsAction.Navigate
                ),
                SettingsItem(
                    title = "Privacy Policy",
                    icon = Icons.Default.PrivacyTip,
                    action = SettingsAction.Navigate
                ),
                SettingsItem(
                    title = "App Version",
                    subtitle = "1.0.0",
                    icon = Icons.Default.Info,
                    action = SettingsAction.Navigate,
                    hasArrow = false
                )
            )
        )
    )
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Gray50)
    ) {
        // Header with user profile
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .clickable { /* Navigate to profile */ },
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Profile picture placeholder
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .background(Primary500),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "JD",
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }
                
                Spacer(modifier = Modifier.width(16.dp))
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "John Doe",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = Gray900
                    )
                    Text(
                        text = "john.doe@example.com",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Gray600
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Surface(
                        color = Success100,
                        shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            text = "Premium Member",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = Success700,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
                
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = Gray400
                )
            }
        }
        
        // Settings sections
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(settingsSections) { section ->
                SettingsSectionCard(
                    section = section,
                    onNotificationsToggle = { notificationsEnabled = it },
                    onDarkModeToggle = { darkModeEnabled = it },
                    onBiometricToggle = { biometricEnabled = it },
                    onAutoSyncToggle = { autoSyncEnabled = it }
                )
            }
            
            // Logout button
            item {
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = { /* Handle logout */ },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Error500)
                ) {
                    Icon(Icons.Default.Logout, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Logout")
                }
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
fun SettingsSectionCard(
    section: SettingsSection,
    onNotificationsToggle: (Boolean) -> Unit = {},
    onDarkModeToggle: (Boolean) -> Unit = {},
    onBiometricToggle: (Boolean) -> Unit = {},
    onAutoSyncToggle: (Boolean) -> Unit = {}
) {
    Card {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = section.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = Gray900
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            section.items.forEachIndexed { index, item ->
                SettingsItemRow(
                    item = item,
                    onToggle = { newValue ->
                        when (item.title) {
                            "Push Notifications" -> onNotificationsToggle(newValue)
                            "Dark Mode" -> onDarkModeToggle(newValue)
                            "Biometric Authentication" -> onBiometricToggle(newValue)
                            "Auto Sync" -> onAutoSyncToggle(newValue)
                        }
                    }
                )
                
                if (index < section.items.size - 1) {
                    Divider(
                        modifier = Modifier.padding(vertical = 8.dp),
                        color = Gray200
                    )
                }
            }
        }
    }
}

@Composable
fun SettingsItemRow(
    item: SettingsItem,
    onToggle: (Boolean) -> Unit = {}
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = !item.hasSwitch) { /* Handle click */ }
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            item.icon,
            contentDescription = null,
            tint = Primary600,
            modifier = Modifier.size(24.dp)
        )
        
        Spacer(modifier = Modifier.width(16.dp))
        
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = item.title,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
                color = Gray900
            )
            item.subtitle?.let { subtitle ->
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = Gray600
                )
            }
        }
        
        if (item.hasSwitch) {
            Switch(
                checked = item.switchValue,
                onCheckedChange = onToggle,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = Color.White,
                    checkedTrackColor = Primary500,
                    uncheckedThumbColor = Color.White,
                    uncheckedTrackColor = Gray300
                )
            )
        } else if (item.hasArrow) {
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = Gray400,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
fun SettingsScreenPreview() {
    HealthCoachAITheme {
        SettingsScreen()
    }
}