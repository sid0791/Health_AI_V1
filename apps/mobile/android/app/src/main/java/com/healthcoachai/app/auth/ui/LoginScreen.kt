package com.healthcoachai.app.auth.ui

import android.app.Activity
import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.common.api.ApiException
import com.healthcoachai.app.auth.AuthenticationService
import com.healthcoachai.app.ui.theme.HealthCoachAITheme
import kotlinx.coroutines.launch

/**
 * Comprehensive Login Screen with OTP and SSO options
 * Supports Phone OTP, Google, Apple, and Facebook Sign-In
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onNavigateToSignUp: () -> Unit = {}
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    
    var showOTPVerification by remember { mutableStateOf(false) }
    var phoneNumber by remember { mutableStateOf("") }
    var otpCode by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf("") }
    
    val authService = remember { AuthenticationService(context) }

    // Google Sign-In launcher
    val googleSignInLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val data = result.data
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            try {
                val account = task.getResult(ApiException::class.java)
                account.serverAuthCode?.let { authCode ->
                    coroutineScope.launch {
                        isLoading = true
                        errorMessage = ""
                        
                        val loginResult = authService.handleGoogleSignIn(authCode)
                        if (loginResult.isSuccess()) {
                            onLoginSuccess()
                        } else {
                            errorMessage = loginResult.exceptionOrNull()?.message 
                                ?: "Google Sign-In failed"
                        }
                        isLoading = false
                    }
                }
            } catch (e: ApiException) {
                errorMessage = "Google Sign-In failed: ${e.message}"
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                        MaterialTheme.colorScheme.background
                    )
                )
            )
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(60.dp))
        
        // Logo and Welcome
        Icon(
            imageVector = Icons.Default.HealthAndSafety,
            contentDescription = "HealthCoach AI Logo",
            modifier = Modifier.size(120.dp),
            tint = MaterialTheme.colorScheme.primary
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        Text(
            text = "Welcome to HealthCoach AI",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        
        Text(
            text = "Your personal health companion",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 8.dp)
        )
        
        Spacer(modifier = Modifier.height(40.dp))

        if (!showOTPVerification) {
            // Phone Number Input
            PhoneNumberInput(
                phoneNumber = phoneNumber,
                onPhoneNumberChange = { phoneNumber = it },
                onSendOTP = {
                    if (phoneNumber.isNotBlank()) {
                        coroutineScope.launch {
                            isLoading = true
                            errorMessage = ""
                            
                            val result = authService.sendOTP(phoneNumber)
                            if (result.isSuccess()) {
                                showOTPVerification = true
                            } else {
                                errorMessage = result.exceptionOrNull()?.message 
                                    ?: "Failed to send OTP"
                            }
                            isLoading = false
                        }
                    }
                },
                isLoading = isLoading
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Social Login Options
            SocialLoginSection(
                onGoogleSignIn = {
                    val signInIntent = authService.getGoogleSignInClient().signInIntent
                    googleSignInLauncher.launch(signInIntent)
                },
                onAppleSignIn = {
                    // Apple Sign-In implementation would go here
                    errorMessage = "Apple Sign-In coming soon"
                },
                onFacebookSignIn = {
                    // Facebook Sign-In implementation would go here
                    errorMessage = "Facebook Sign-In coming soon"
                },
                isLoading = isLoading
            )
        } else {
            // OTP Verification
            OTPVerificationInput(
                otpCode = otpCode,
                onOTPCodeChange = { otpCode = it },
                onVerifyOTP = {
                    if (otpCode.isNotBlank()) {
                        coroutineScope.launch {
                            isLoading = true
                            errorMessage = ""
                            
                            val result = authService.verifyOTP(phoneNumber, otpCode)
                            if (result.isSuccess()) {
                                onLoginSuccess()
                            } else {
                                errorMessage = result.exceptionOrNull()?.message 
                                    ?: "Invalid OTP"
                            }
                            isLoading = false
                        }
                    }
                },
                onResendOTP = {
                    coroutineScope.launch {
                        isLoading = true
                        errorMessage = ""
                        
                        val result = authService.sendOTP(phoneNumber)
                        if (!result.isSuccess()) {
                            errorMessage = result.exceptionOrNull()?.message 
                                ?: "Failed to resend OTP"
                        }
                        isLoading = false
                    }
                },
                onBack = { showOTPVerification = false },
                isLoading = isLoading,
                phoneNumber = phoneNumber
            )
        }
        
        // Error Message
        if (errorMessage.isNotBlank()) {
            Spacer(modifier = Modifier.height(16.dp))
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = errorMessage,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(16.dp)
                )
            }
        }
        
        Spacer(modifier = Modifier.height(32.dp))
        
        // Terms and Privacy
        Text(
            text = "By continuing, you agree to our Terms of Service and Privacy Policy",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        
        Spacer(modifier = Modifier.height(40.dp))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PhoneNumberInput(
    phoneNumber: String,
    onPhoneNumberChange: (String) -> Unit,
    onSendOTP: () -> Unit,
    isLoading: Boolean
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(20.dp)
        ) {
            Text(
                text = "Sign in with Phone",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            OutlinedTextField(
                value = phoneNumber,
                onValueChange = onPhoneNumberChange,
                label = { Text("Phone Number") },
                placeholder = { Text("+91 98765 43210") },
                leadingIcon = {
                    Icon(Icons.Default.Phone, contentDescription = null)
                },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            
            Spacer(modifier = Modifier.height(20.dp))
            
            Button(
                onClick = onSendOTP,
                modifier = Modifier.fillMaxWidth(),
                enabled = !isLoading && phoneNumber.isNotBlank()
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text("Send OTP")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OTPVerificationInput(
    otpCode: String,
    onOTPCodeChange: (String) -> Unit,
    onVerifyOTP: () -> Unit,
    onResendOTP: () -> Unit,
    onBack: () -> Unit,
    isLoading: Boolean,
    phoneNumber: String
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(20.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
                Text(
                    text = "Verify OTP",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "Enter the 6-digit code sent to $phoneNumber",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            OutlinedTextField(
                value = otpCode,
                onValueChange = { if (it.length <= 6) onOTPCodeChange(it) },
                label = { Text("OTP Code") },
                placeholder = { Text("123456") },
                leadingIcon = {
                    Icon(Icons.Default.Lock, contentDescription = null)
                },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Button(
                onClick = onVerifyOTP,
                modifier = Modifier.fillMaxWidth(),
                enabled = !isLoading && otpCode.length == 6
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text("Verify OTP")
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            TextButton(
                onClick = onResendOTP,
                modifier = Modifier.fillMaxWidth(),
                enabled = !isLoading
            ) {
                Text("Resend OTP")
            }
        }
    }
}

@Composable
private fun SocialLoginSection(
    onGoogleSignIn: () -> Unit,
    onAppleSignIn: () -> Unit,
    onFacebookSignIn: () -> Unit,
    isLoading: Boolean
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            HorizontalDivider(modifier = Modifier.weight(1f))
            Text(
                text = "  or continue with  ",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            )
            HorizontalDivider(modifier = Modifier.weight(1f))
        }
        
        Spacer(modifier = Modifier.height(20.dp))
        
        // Google Sign-In
        OutlinedButton(
            onClick = onGoogleSignIn,
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading
        ) {
            Icon(
                imageVector = Icons.Default.Login,
                contentDescription = null,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Continue with Google")
        }
        
        Spacer(modifier = Modifier.height(12.dp))
        
        // Apple Sign-In
        OutlinedButton(
            onClick = onAppleSignIn,
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading
        ) {
            Icon(
                imageVector = Icons.Default.Apple,
                contentDescription = null,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Continue with Apple")
        }
        
        Spacer(modifier = Modifier.height(12.dp))
        
        // Facebook Sign-In
        OutlinedButton(
            onClick = onFacebookSignIn,
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading
        ) {
            Icon(
                imageVector = Icons.Default.Facebook,
                contentDescription = null,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Continue with Facebook")
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun LoginScreenPreview() {
    HealthCoachAITheme {
        LoginScreen(
            onLoginSuccess = {}
        )
    }
}