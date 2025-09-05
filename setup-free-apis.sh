#!/bin/bash

# 🚀 FREE AI APIs SETUP SCRIPT
# 
# This script helps you quickly set up free AI APIs for the Health AI platform.
# Run this script and follow the prompts to configure your free API keys.

echo "🚀 HEALTH AI - FREE APIS SETUP"
echo "==============================="
echo ""
echo "This script will help you set up free AI APIs to replace mock responses."
echo "You'll need to get API keys from the providers you want to use."
echo ""

# Check if .env file exists
if [ ! -f "services/backend/.env" ]; then
    echo "📁 Creating .env file from template..."
    cp services/backend/.env.example services/backend/.env
    echo "✅ Created services/backend/.env"
else
    echo "📁 Found existing .env file"
fi

echo ""
echo "🔑 FREE API PROVIDERS:"
echo ""
echo "1. 🤖 Google Gemini (RECOMMENDED - Best free tier)"
echo "   • Get API key: https://makersuite.google.com/app/apikey"
echo "   • Free quota: 60 requests/minute"
echo "   • Best for: Medical analysis, meal planning"
echo ""
echo "2. ⚡ Groq (Ultra-fast responses)"
echo "   • Get API key: https://console.groq.com/keys"
echo "   • Free tier with rate limits"
echo "   • Best for: Quick chat responses"
echo ""
echo "3. 🔓 Together AI (Open source models - $1-3/1M tokens)"
echo "   • Get API key: https://api.together.xyz/settings/api-keys"
echo "   • Very affordable"
echo "   • Best for: Recipe generation"
echo ""
echo "4. 🤗 Hugging Face (Free inference)"
echo "   • Get API key: https://huggingface.co/settings/tokens"
echo "   • Completely free"
echo "   • Best for: Text processing"
echo ""
echo "5. 🔄 Cohere (Trial credits)"
echo "   • Get API key: https://dashboard.cohere.ai/api-keys"
echo "   • Trial credits included"
echo "   • Best for: Summaries"
echo ""

read -p "📝 Press Enter when you have your API keys ready, or Ctrl+C to exit..."

echo ""
echo "🛠️ CONFIGURATION:"
echo ""
echo "Now you need to edit the .env file and replace the placeholder values:"
echo ""
echo "File location: services/backend/.env"
echo ""
echo "Replace these placeholders with your actual API keys:"
echo "  GOOGLE_AI_API_KEY=YOUR_GOOGLE_GEMINI_API_KEY_HERE"
echo "  GROQ_API_KEY=YOUR_GROQ_API_KEY_HERE"
echo "  TOGETHER_API_KEY=YOUR_TOGETHER_API_KEY_HERE"
echo "  HUGGINGFACE_API_KEY=YOUR_HUGGINGFACE_API_KEY_HERE"
echo "  COHERE_API_KEY=YOUR_COHERE_API_KEY_HERE"
echo ""

# Check if user wants to edit the file now
read -p "🖊️ Do you want to edit the .env file now? (y/n): " edit_now

if [[ $edit_now =~ ^[Yy]$ ]]; then
    # Try to open with common editors
    if command -v code >/dev/null 2>&1; then
        echo "📝 Opening in VS Code..."
        code services/backend/.env
    elif command -v nano >/dev/null 2>&1; then
        echo "📝 Opening in nano..."
        nano services/backend/.env
    elif command -v vim >/dev/null 2>&1; then
        echo "📝 Opening in vim..."
        vim services/backend/.env
    else
        echo "⚠️ No editor found. Please manually edit: services/backend/.env"
    fi
else
    echo "📝 Please manually edit: services/backend/.env"
fi

echo ""
echo "🧪 TESTING:"
echo ""
echo "After adding your API keys, test them with:"
echo "  node test-free-apis.js"
echo ""
echo "Then start the backend:"
echo "  cd services/backend && npm run start:dev"
echo ""
echo "🎉 Your Health AI will now use real AI instead of mock responses!"