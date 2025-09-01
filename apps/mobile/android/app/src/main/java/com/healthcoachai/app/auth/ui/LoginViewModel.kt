package com.healthcoachai.app.auth.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.healthcoachai.app.auth.AuthenticationService
import com.healthcoachai.app.network.ApiResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * LoginViewModel - Manages authentication state and business logic
 */
class LoginViewModel(
    private val authService: AuthenticationService? = null
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()
    
    fun sendOTP(phoneNumber: String) {
        if (authService == null) return
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                errorMessage = null
            )
            
            val result = authService.sendOTP(phoneNumber)
            
            when (result) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        showOTPVerification = true,
                        phoneNumber = phoneNumber
                    )
                }
                is ApiResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = result.exception.message
                    )
                }
            }
        }
    }
    
    fun verifyOTP(phoneNumber: String, otpCode: String, onSuccess: () -> Unit) {
        if (authService == null) return
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                errorMessage = null
            )
            
            val result = authService.verifyOTP(phoneNumber, otpCode)
            
            when (result) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isAuthenticated = true
                    )
                    onSuccess()
                }
                is ApiResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = result.exception.message
                    )
                }
            }
        }
    }
    
    fun handleGoogleSignIn(authCode: String, onSuccess: () -> Unit) {
        if (authService == null) return
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                errorMessage = null
            )
            
            val result = authService.handleGoogleSignIn(authCode)
            
            when (result) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isAuthenticated = true
                    )
                    onSuccess()
                }
                is ApiResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = result.exception.message
                    )
                }
            }
        }
    }
    
    fun handleAppleSignIn(authCode: String, onSuccess: () -> Unit) {
        if (authService == null) return
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                errorMessage = null
            )
            
            val result = authService.handleAppleSignIn(authCode)
            
            when (result) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isAuthenticated = true
                    )
                    onSuccess()
                }
                is ApiResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = result.exception.message
                    )
                }
            }
        }
    }
    
    fun handleFacebookSignIn(accessToken: String, onSuccess: () -> Unit) {
        if (authService == null) return
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                errorMessage = null
            )
            
            val result = authService.handleFacebookSignIn(accessToken)
            
            when (result) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isAuthenticated = true
                    )
                    onSuccess()
                }
                is ApiResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = result.exception.message
                    )
                }
            }
        }
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
    
    fun goBack() {
        _uiState.value = _uiState.value.copy(
            showOTPVerification = false,
            errorMessage = null
        )
    }
}

data class LoginUiState(
    val isLoading: Boolean = false,
    val isAuthenticated: Boolean = false,
    val showOTPVerification: Boolean = false,
    val phoneNumber: String = "",
    val errorMessage: String? = null
)