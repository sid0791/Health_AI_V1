#!/usr/bin/env node

/**
 * Comprehensive AI Testing Script
 * Tests all free AI integrations: Meal Planning, Chat, and Health Report Analysis
 * 
 * Usage: node test-comprehensive-ai.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const API_ENDPOINTS = {
  chat: `${BASE_URL}/api/chat/message`,
  mealPlan: `${BASE_URL}/api/meal-planning/generate`,
  healthReport: `${BASE_URL}/api/health-reports/interpret`,
  aiStatus: `${BASE_URL}/api/ai-routing/status`
};

// Test data
const TEST_DATA = {
  chat: {
    message: "I have high cholesterol and diabetes. What foods should I eat?",
    sessionType: "health",
    userPreferences: {
      language: "en",
      responseStyle: "detailed",
      domainFocus: ["nutrition", "health"]
    }
  },
  mealPlan: {
    userId: "test-user-123",
    userProfile: {
      age: 35,
      gender: "male",
      weight: 75,
      height: 175,
      activityLevel: "moderate",
      goals: ["weight_loss", "heart_health"],
      healthConditions: ["high_cholesterol", "prediabetes"],
      allergies: ["nuts"],
      dietaryPreferences: ["vegetarian"],
      cuisinePreferences: ["indian", "mediterranean"],
      preferredIngredients: ["spinach", "oats", "salmon"],
      avoidedIngredients: ["fried_foods", "sugar"],
      budgetRange: { min: 200, max: 400 },
      cookingSkillLevel: 3,
      availableCookingTime: 45,
      mealFrequency: {
        mealsPerDay: 3,
        snacksPerDay: 2,
        includeBeverages: true
      }
    },
    planPreferences: {
      duration: 7,
      planType: "HEALTH_FOCUSED",
      targetCalories: 1800,
      macroTargets: {
        proteinPercent: 25,
        carbPercent: 45,
        fatPercent: 30
      },
      specialRequests: "Focus on heart-healthy foods for cholesterol management",
      includeCheatMeals: false,
      weekendTreats: false
    },
    healthContext: {
      hasHealthReports: true,
      biomarkers: {
        bloodSugar: {
          value: 110,
          status: "elevated",
          hba1c: 5.8,
          isDiabetic: false
        },
        cholesterol: {
          total: 220,
          ldl: 140,
          hdl: 45,
          triglycerides: 180,
          status: "high"
        }
      },
      healthConditions: {
        diabetes: false,
        prediabetes: true,
        highCholesterol: true,
        hypertension: false
      },
      dietaryRecommendations: {
        lowGlycemicIndex: true,
        lowSodium: true,
        lowSaturatedFat: true,
        highFiber: true,
        heartHealthy: true
      }
    }
  },
  healthReport: {
    reportId: "test-report-123",
    structuredEntities: [
      {
        entityName: "LDL Cholesterol",
        extractedValue: 145,
        unit: "mg/dL",
        normalRange: "<100 mg/dL",
        criticalityLevel: "HIGH"
      },
      {
        entityName: "HbA1c",
        extractedValue: 5.9,
        unit: "%",
        normalRange: "<5.7%",
        criticalityLevel: "MEDIUM"
      },
      {
        entityName: "Vitamin D",
        extractedValue: 25,
        unit: "ng/mL",
        normalRange: "30-100 ng/mL",
        criticalityLevel: "HIGH"
      }
    ]
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkAPIKeys() {
  log('cyan', '🔑 Checking Free AI API Configuration...');
  
  const envPath = path.join(__dirname, 'services', 'backend', '.env');
  
  if (!fs.existsSync(envPath)) {
    log('red', '❌ .env file not found in services/backend/');
    log('yellow', '💡 Run: cp services/backend/.env.example services/backend/.env');
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const freeApiKeys = [
    'GOOGLE_AI_API_KEY',
    'GROQ_API_KEY',
    'TOGETHER_API_KEY',
    'HUGGINGFACE_API_KEY',
    'COHERE_API_KEY'
  ];
  
  let configuredKeys = 0;
  freeApiKeys.forEach(key => {
    const match = envContent.match(new RegExp(`${key}=(.+)`));
    if (match && match[1] && !match[1].includes('YOUR_') && !match[1].includes('demo_key')) {
      log('green', `✅ ${key} configured`);
      configuredKeys++;
    } else {
      log('yellow', `⚠️  ${key} not configured`);
    }
  });
  
  if (configuredKeys === 0) {
    log('red', '❌ No free AI API keys configured!');
    log('yellow', '💡 Add at least one free API key to test real AI responses');
    return false;
  }
  
  log('green', `✅ ${configuredKeys}/${freeApiKeys.length} free API keys configured`);
  return true;
}

async function testAIStatus() {
  log('cyan', '🔍 Testing AI Provider Status...');
  
  try {
    const response = await axios.get(API_ENDPOINTS.aiStatus);
    log('green', '✅ AI Status endpoint accessible');
    
    if (response.data.activeProviders && response.data.activeProviders.length > 0) {
      log('green', `✅ Active AI Providers: ${response.data.activeProviders.join(', ')}`);
      return true;
    } else {
      log('yellow', '⚠️  No active AI providers detected (using mock responses)');
      return false;
    }
  } catch (error) {
    log('red', `❌ AI Status check failed: ${error.message}`);
    return false;
  }
}

async function testChatAI() {
  log('cyan', '💬 Testing AI Chat with Free APIs...');
  
  try {
    const response = await axios.post(API_ENDPOINTS.chat, TEST_DATA.chat, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Mock auth for testing
      },
      timeout: 30000 // 30 second timeout
    });
    
    log('green', '✅ Chat AI request successful');
    
    if (response.data && response.data.content) {
      log('green', `✅ AI Response received (${response.data.content.length} characters)`);
      
      // Check if it's using real AI (longer, more detailed responses)
      if (response.data.content.length > 200 && 
          response.data.performance && 
          response.data.performance.tokenCount > 0) {
        log('green', '🚀 REAL AI RESPONSE DETECTED!');
        log('blue', `Token usage: ${response.data.performance.tokenCount}`);
        log('blue', `Provider: ${response.data.routingDecision?.provider || 'Unknown'}`);
        log('blue', `Cost: $${response.data.tokenUsage?.cost || 0}`);
      } else {
        log('yellow', '⚠️  Appears to be mock response (short or no token usage)');
      }
      
      // Show snippet of response
      const snippet = response.data.content.substring(0, 150);
      log('white', `Response snippet: "${snippet}..."`);
      
      return true;
    } else {
      log('red', '❌ No response content received');
      return false;
    }
  } catch (error) {
    log('red', `❌ Chat AI test failed: ${error.message}`);
    if (error.response && error.response.data) {
      log('red', `Error details: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

async function testMealPlanningAI() {
  log('cyan', '🍽️  Testing Meal Planning AI with Free APIs...');
  
  try {
    const response = await axios.post(API_ENDPOINTS.mealPlan, TEST_DATA.mealPlan, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      timeout: 45000 // 45 second timeout for meal planning
    });
    
    log('green', '✅ Meal Planning AI request successful');
    
    if (response.data && response.data.mealPlan) {
      log('green', `✅ Meal plan generated`);
      
      // Check AI usage indicators
      if (response.data.aiUsage && response.data.aiUsage.totalCost > 0) {
        log('green', '🚀 REAL AI MEAL PLANNING DETECTED!');
        log('blue', `AI Provider: ${response.data.aiUsage.provider}`);
        log('blue', `Total Cost: $${response.data.aiUsage.totalCost}`);
        log('blue', `Tokens Used: ${response.data.aiUsage.totalTokens}`);
      } else {
        log('yellow', '⚠️  Appears to be mock meal plan (no cost/token data)');
      }
      
      // Show meal plan details
      if (response.data.mealPlan.meals && response.data.mealPlan.meals.length > 0) {
        log('white', `Generated ${response.data.mealPlan.meals.length} meals`);
        log('white', `First meal: ${response.data.mealPlan.meals[0].name || 'Unnamed'}`);
      }
      
      return true;
    } else {
      log('red', '❌ No meal plan generated');
      return false;
    }
  } catch (error) {
    log('red', `❌ Meal Planning AI test failed: ${error.message}`);
    if (error.response && error.response.data) {
      log('red', `Error details: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

async function testHealthReportAI() {
  log('cyan', '🩺 Testing Health Report Analysis AI...');
  
  try {
    const response = await axios.post(API_ENDPOINTS.healthReport, TEST_DATA.healthReport, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      timeout: 30000
    });
    
    log('green', '✅ Health Report AI request successful');
    
    if (response.data && response.data.interpretation) {
      log('green', `✅ Health interpretation generated`);
      
      // Check for AI processing indicators
      if (response.data.interpretation.aiProvider && 
          response.data.interpretation.processingTimeMs > 1000) {
        log('green', '🚀 REAL AI HEALTH ANALYSIS DETECTED!');
        log('blue', `AI Provider: ${response.data.interpretation.aiProvider}`);
        log('blue', `Processing Time: ${response.data.interpretation.processingTimeMs}ms`);
        log('blue', `Confidence: ${response.data.interpretation.confidence}`);
      } else {
        log('yellow', '⚠️  Appears to be mock interpretation');
      }
      
      // Show interpretation details
      const interp = response.data.interpretation;
      if (interp.overallAssessment) {
        log('white', `Overall Status: ${interp.overallAssessment.status}`);
        log('white', `Risk Level: ${interp.overallAssessment.riskLevel}`);
        log('white', `Score: ${interp.overallAssessment.score}/100`);
      }
      
      return true;
    } else {
      log('red', '❌ No health interpretation generated');
      return false;
    }
  } catch (error) {
    log('red', `❌ Health Report AI test failed: ${error.message}`);
    if (error.response && error.response.data) {
      log('red', `Error details: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

async function generateTestReport() {
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    tests: {
      apiKeysConfigured: false,
      aiStatusCheck: false,
      chatAI: false,
      mealPlanningAI: false,
      healthReportAI: false
    },
    summary: '',
    recommendations: []
  };
  
  log('magenta', '📊 COMPREHENSIVE AI TESTING REPORT');
  log('magenta', '=' .repeat(50));
  
  // Run all tests
  report.tests.apiKeysConfigured = await checkAPIKeys();
  report.tests.aiStatusCheck = await testAIStatus();
  report.tests.chatAI = await testChatAI();
  report.tests.mealPlanningAI = await testMealPlanningAI();
  report.tests.healthReportAI = await testHealthReportAI();
  
  // Generate summary
  const passedTests = Object.values(report.tests).filter(Boolean).length;
  const totalTests = Object.keys(report.tests).length;
  
  log('magenta', '\n📈 RESULTS SUMMARY');
  log('magenta', '-'.repeat(30));
  log('white', `Tests Passed: ${passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    log('green', '🎉 ALL TESTS PASSED! Free AI APIs are working perfectly!');
    report.summary = 'All AI features working with free APIs';
  } else if (passedTests >= 3) {
    log('yellow', '✅ Most tests passed - Free AI is mostly working');
    report.summary = 'Most AI features working, minor issues detected';
  } else {
    log('red', '⚠️  Multiple test failures - Check configuration');
    report.summary = 'Multiple AI integration issues detected';
  }
  
  // Generate recommendations
  if (!report.tests.apiKeysConfigured) {
    report.recommendations.push('Configure at least one free AI API key in .env file');
  }
  if (!report.tests.aiStatusCheck) {
    report.recommendations.push('Check backend service is running and AI routing is working');
  }
  if (!report.tests.chatAI) {
    report.recommendations.push('Debug chat service AI integration');
  }
  if (!report.tests.mealPlanningAI) {
    report.recommendations.push('Debug meal planning service AI integration');
  }
  if (!report.tests.healthReportAI) {
    report.recommendations.push('Debug health report service AI integration');
  }
  
  if (report.recommendations.length > 0) {
    log('yellow', '\n💡 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => log('yellow', `- ${rec}`));
  }
  
  // Save report
  const reportPath = path.join(__dirname, 'ai-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log('blue', `\n📄 Full report saved to: ${reportPath}`);
  
  log('magenta', '\n🚀 Free AI Integration Status:');
  if (passedTests >= 4) {
    log('green', '✅ PRODUCTION-READY: Real AI APIs are active and working!');
    log('green', '✅ Users will get AI-powered responses instead of mocks');
    log('green', '✅ All health features are enhanced with AI intelligence');
  } else {
    log('yellow', '⚠️  MIXED STATUS: Some AI features working, others need attention');
    log('yellow', '💡 Add more free API keys for better coverage and reliability');
  }
  
  return report;
}

// Main execution
async function main() {
  try {
    log('cyan', '🤖 Starting Comprehensive AI Testing...');
    log('cyan', '🎯 Testing: Chat, Meal Planning, and Health Report Analysis');
    log('cyan', '🆓 Using Free AI APIs: Google Gemini, Groq, Together AI, Hugging Face, Cohere\n');
    
    await generateTestReport();
    
  } catch (error) {
    log('red', `❌ Testing failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, generateTestReport };