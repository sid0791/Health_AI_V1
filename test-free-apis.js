#!/usr/bin/env node

/**
 * 🧪 FREE AI APIs TEST SCRIPT
 * 
 * This script tests the free AI API integrations to verify they work
 * before using them in the Health AI application.
 * 
 * Usage:
 * 1. Add your free API keys to services/backend/.env
 * 2. Run: node test-free-apis.js
 * 
 * The script will test each configured API and show which ones are working.
 */

require('dotenv').config({ path: './services/backend/.env' });
const axios = require('axios');

// Test data
const testPrompt = "Generate a simple healthy breakfast recipe in JSON format with name, ingredients, and calories.";

// Helper function to estimate tokens
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// Test Google Gemini (Free tier)
async function testGemini() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey || apiKey === 'YOUR_GOOGLE_GEMINI_API_KEY_HERE') {
    console.log('❌ Google Gemini: API key not configured');
    return false;
  }

  try {
    console.log('🧪 Testing Google Gemini API...');
    
    // Using REST API instead of SDK for simpler testing
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts: [{
            text: `You are HealthCoachAI. ${testPrompt}`
          }]
        }]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    const result = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    console.log('✅ Google Gemini: SUCCESS');
    console.log(`📝 Response length: ${result.length} characters`);
    console.log(`💰 Estimated cost: FREE (within quota)`);
    return true;
  } catch (error) {
    console.log('❌ Google Gemini: FAILED');
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

// Test Groq (Free ultra-fast inference)
async function testGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey || apiKey === 'YOUR_GROQ_API_KEY_HERE') {
    console.log('❌ Groq: API key not configured');
    return false;
  }

  try {
    console.log('🧪 Testing Groq API...');
    
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are HealthCoachAI, an expert nutritionist.'
          },
          {
            role: 'user',
            content: testPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const result = response.data?.choices?.[0]?.message?.content || 'No response';
    const usage = response.data?.usage || {};
    console.log('✅ Groq: SUCCESS');
    console.log(`📝 Response length: ${result.length} characters`);
    console.log(`🔢 Tokens used: ${usage.total_tokens || 'N/A'}`);
    console.log(`💰 Estimated cost: $${((usage.total_tokens || 0) * 0.00027 / 1000).toFixed(6)}`);
    return true;
  } catch (error) {
    console.log('❌ Groq: FAILED');
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

// Test Together AI (Affordable open source models)
async function testTogether() {
  const apiKey = process.env.TOGETHER_API_KEY;
  
  if (!apiKey || apiKey === 'YOUR_TOGETHER_API_KEY_HERE') {
    console.log('❌ Together AI: API key not configured');
    return false;
  }

  try {
    console.log('🧪 Testing Together AI API...');
    
    const response = await axios.post(
      'https://api.together.xyz/v1/chat/completions',
      {
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        messages: [
          {
            role: 'system',
            content: 'You are HealthCoachAI, an expert nutritionist.'
          },
          {
            role: 'user',
            content: testPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    const result = response.data?.choices?.[0]?.message?.content || 'No response';
    const usage = response.data?.usage || {};
    console.log('✅ Together AI: SUCCESS');
    console.log(`📝 Response length: ${result.length} characters`);
    console.log(`🔢 Tokens used: ${usage.total_tokens || 'N/A'}`);
    console.log(`💰 Estimated cost: $${((usage.total_tokens || 0) * 0.002 / 1000).toFixed(6)}`);
    return true;
  } catch (error) {
    console.log('❌ Together AI: FAILED');
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

// Test Hugging Face (Free inference API)
async function testHuggingFace() {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey || apiKey === 'YOUR_HUGGINGFACE_API_KEY_HERE') {
    console.log('❌ Hugging Face: API key not configured');
    return false;
  }

  try {
    console.log('🧪 Testing Hugging Face API...');
    
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
      {
        inputs: `You are HealthCoachAI. ${testPrompt}`,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          return_full_text: false
        },
        options: {
          wait_for_model: true
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 45000
      }
    );

    const result = Array.isArray(response.data) ? 
      response.data[0]?.generated_text || 'No response' : 
      response.data?.generated_text || 'No response';
    
    console.log('✅ Hugging Face: SUCCESS');
    console.log(`📝 Response length: ${result.length} characters`);
    console.log(`💰 Cost: FREE`);
    return true;
  } catch (error) {
    console.log('❌ Hugging Face: FAILED');
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Test Cohere (Trial credits)
async function testCohere() {
  const apiKey = process.env.COHERE_API_KEY;
  
  if (!apiKey || apiKey === 'YOUR_COHERE_API_KEY_HERE') {
    console.log('❌ Cohere: API key not configured');
    return false;
  }

  try {
    console.log('🧪 Testing Cohere API...');
    
    const response = await axios.post(
      'https://api.cohere.ai/v1/generate',
      {
        model: 'command',
        prompt: `You are HealthCoachAI, an expert nutritionist. ${testPrompt}`,
        max_tokens: 1000,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 45000
      }
    );

    const result = response.data?.generations?.[0]?.text || 'No response';
    console.log('✅ Cohere: SUCCESS');
    console.log(`📝 Response length: ${result.length} characters`);
    console.log(`💰 Estimated cost: $${(estimateTokens(result) * 0.008 / 1000).toFixed(6)}`);
    return true;
  } catch (error) {
    console.log('❌ Cohere: FAILED');
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 TESTING FREE AI APIs FOR HEALTH AI');
  console.log('=====================================\n');

  const results = [];
  
  results.push(await testGemini());
  console.log('');
  
  results.push(await testGroq());
  console.log('');
  
  results.push(await testTogether());
  console.log('');
  
  results.push(await testHuggingFace());
  console.log('');
  
  results.push(await testCohere());
  console.log('');

  // Summary
  const successCount = results.filter(Boolean).length;
  const totalCount = results.length;
  
  console.log('📊 SUMMARY:');
  console.log('===========');
  console.log(`✅ Working APIs: ${successCount}/${totalCount}`);
  console.log(`❌ Failed APIs: ${totalCount - successCount}/${totalCount}`);
  
  if (successCount > 0) {
    console.log('\n🎉 SUCCESS! You have working free AI APIs configured.');
    console.log('   The Health AI system will now use real AI instead of mock responses.');
    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Start the backend server: cd services/backend && npm run start:dev');
    console.log('   2. Test meal planning in the frontend');
    console.log('   3. Monitor costs and usage in provider dashboards');
  } else {
    console.log('\n⚠️  No working APIs found. Please:');
    console.log('   1. Get free API keys from the providers');
    console.log('   2. Add them to services/backend/.env');
    console.log('   3. Run this test again');
    console.log('\n🔗 Get free API keys:');
    console.log('   • Google Gemini: https://makersuite.google.com/app/apikey');
    console.log('   • Groq: https://console.groq.com/keys');
    console.log('   • Together AI: https://api.together.xyz/settings/api-keys');
    console.log('   • Hugging Face: https://huggingface.co/settings/tokens');
    console.log('   • Cohere: https://dashboard.cohere.ai/api-keys');
  }
  
  return successCount > 0;
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };