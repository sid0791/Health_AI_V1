package com.healthcoachai.app.ui.components.modals

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.healthcoachai.app.ui.theme.*
import kotlinx.coroutines.delay
import android.content.Intent
import android.net.Uri

data class PhysicianAlert(
    val id: String,
    val type: AlertType,
    val severity: AlertSeverity,
    val title: String,
    val description: String,
    val values: AlertValues,
    val recommendations: List<String>,
    val emergencyContacts: List<EmergencyContact> = emptyList(),
    val triggeredAt: String
)

data class AlertValues(
    val current: String,
    val normal: String,
    val unit: String? = null
)

data class EmergencyContact(
    val name: String,
    val phone: String,
    val relation: String
)

enum class AlertType {
    BLOOD_PRESSURE,
    BLOOD_SUGAR,
    HEART_RATE,
    WEIGHT_CHANGE,
    MEDICATION_INTERACTION,
    LAB_VALUES
}

enum class AlertSeverity {
    MODERATE,
    HIGH,
    CRITICAL
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PhysicianRedFlagModal(
    alert: PhysicianAlert?,
    isOpen: Boolean,
    onClose: () -> Unit,
    onContactPhysician: () -> Unit,
    onEmergencyCall: () -> Unit,
    onDismiss: (String) -> Unit
) {
    val context = LocalContext.current
    var timeRemaining by remember { mutableStateOf(30) }
    
    // Countdown timer for critical alerts
    LaunchedEffect(isOpen, alert?.severity) {
        if (isOpen && alert?.severity == AlertSeverity.CRITICAL) {
            while (timeRemaining > 0) {
                delay(1000)
                timeRemaining--
            }
        }
    }
    
    if (isOpen && alert != null) {
        Dialog(
            onDismissRequest = { 
                if (alert.severity != AlertSeverity.CRITICAL) onClose() 
            },
            properties = DialogProperties(
                dismissOnBackPress = alert.severity != AlertSeverity.CRITICAL,
                dismissOnClickOutside = alert.severity != AlertSeverity.CRITICAL,
                usePlatformDefaultWidth = false
            )
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .heightIn(max = 600.dp),
                shape = RoundedCornerShape(20.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 16.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState())
                ) {
                    // Header
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                color = when (alert.severity) {
                                    AlertSeverity.CRITICAL -> Error500
                                    AlertSeverity.HIGH -> Warning500
                                    AlertSeverity.MODERATE -> Primary500
                                },
                                shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
                            )
                            .padding(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = when (alert.severity) {
                                        AlertSeverity.CRITICAL -> "🚨"
                                        AlertSeverity.HIGH -> "⚠️"
                                        AlertSeverity.MODERATE -> "⚡"
                                    },
                                    style = MaterialTheme.typography.headlineMedium
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text(
                                        text = getAlertTypeTitle(alert.type),
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                    Text(
                                        text = "${alert.severity.name.lowercase().replaceFirstChar { it.uppercase() }} Priority",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = Color.White.copy(alpha = 0.9f)
                                    )
                                }
                            }
                            
                            if (alert.severity == AlertSeverity.CRITICAL) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(
                                        text = "Auto-dismiss in",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color.White.copy(alpha = 0.75f)
                                    )
                                    Text(
                                        text = "${timeRemaining}s",
                                        style = MaterialTheme.typography.headlineSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }
                            }
                        }
                    }
                    
                    // Content
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Alert Description
                        Column {
                            Text(
                                text = alert.title,
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = alert.description,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        
                        // Values Display
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Text(
                                    text = "Current Reading",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
                                        Row(
                                            verticalAlignment = Alignment.Bottom
                                        ) {
                                            Text(
                                                text = alert.values.current,
                                                style = MaterialTheme.typography.headlineMedium,
                                                fontWeight = FontWeight.Bold,
                                                color = Error500
                                            )
                                            alert.values.unit?.let { unit ->
                                                Text(
                                                    text = " $unit",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = Error500
                                                )
                                            }
                                        }
                                        Text(
                                            text = "Current Value",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    Column(
                                        horizontalAlignment = Alignment.End
                                    ) {
                                        Text(
                                            text = alert.values.normal,
                                            style = MaterialTheme.typography.titleLarge,
                                            fontWeight = FontWeight.Medium,
                                            color = Success500
                                        )
                                        Text(
                                            text = "Normal Range",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            }
                        }
                        
                        // Recommendations
                        Column {
                            Text(
                                text = "Immediate Recommendations",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            alert.recommendations.forEach { recommendation ->
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.Top
                                ) {
                                    Text(
                                        text = "•",
                                        color = Primary500,
                                        style = MaterialTheme.typography.bodyMedium,
                                        modifier = Modifier.padding(end = 8.dp, top = 2.dp)
                                    )
                                    Text(
                                        text = recommendation,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }
                        }
                        
                        // Action Buttons
                        if (alert.severity == AlertSeverity.CRITICAL) {
                            Column(
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Button(
                                    onClick = onEmergencyCall,
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = Error500
                                    )
                                ) {
                                    Text("🚨 Call Emergency Services")
                                }
                                Button(
                                    onClick = onContactPhysician,
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = Primary500
                                    )
                                ) {
                                    Text("📞 Contact My Physician")
                                }
                            }
                        } else {
                            Column(
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Button(
                                    onClick = onContactPhysician,
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = Primary500
                                    )
                                ) {
                                    Text("📞 Contact My Physician")
                                }
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    OutlinedButton(
                                        onClick = { onDismiss(alert.id) },
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("Acknowledge")
                                    }
                                    FilledTonalButton(
                                        onClick = onClose,
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("Remind Later")
                                    }
                                }
                            }
                        }
                        
                        // Disclaimer
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp)
                            ) {
                                Text(
                                    text = "⚠️ Medical Disclaimer",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Medium
                                )
                                Text(
                                    text = "This alert is based on health data analysis and should not replace professional medical advice. Always consult with your healthcare provider for medical concerns.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        
                        // Timestamp
                        Text(
                            text = "Alert triggered: ${alert.triggeredAt}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }
    }
}

private fun getAlertTypeTitle(type: AlertType): String {
    return when (type) {
        AlertType.BLOOD_PRESSURE -> "Blood Pressure Alert"
        AlertType.BLOOD_SUGAR -> "Blood Sugar Alert"
        AlertType.HEART_RATE -> "Heart Rate Alert"
        AlertType.WEIGHT_CHANGE -> "Weight Change Alert"
        AlertType.MEDICATION_INTERACTION -> "Medication Interaction Alert"
        AlertType.LAB_VALUES -> "Lab Values Alert"
    }
}

@Preview(showBackground = true)
@Composable
fun PhysicianRedFlagModalPreview() {
    HealthCoachAITheme {
        Box(modifier = Modifier.fillMaxSize()) {
            // Preview placeholder
        }
    }
}