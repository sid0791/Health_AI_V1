# HealthCoach AI - GitHub Codespace Setup Guide

Welcome to HealthCoach AI! This guide will help you run and test the complete
application in GitHub Codespaces for real-time user interaction and testing.

## 🔒 Firewall & Privacy Configuration

**✅ No Firewall Issues!** HealthCoach AI is configured to work in secure,
restricted environments:

- **Telemetry Disabled**: All Next.js telemetry is completely disabled via
  environment variables
- **Zero External Requests**: No data sent to tracking servers
- **Firewall-Friendly**: No blocked connections to telemetry.nextjs.org
- **Privacy-First**: Your development activity remains completely private
- **Improved Setup**: Enhanced error handling and timeout prevention

For detailed information, see:
[TELEMETRY_FIREWALL_FIX.md](./TELEMETRY_FIREWALL_FIX.md)

**🔧 Quick Verification**: Run `./verify-codespace.sh` to check your setup is
working correctly.

## 🚀 Quick Start in GitHub Codespaces

### 1. Open in Codespaces

1. Go to the
   [HealthCoach AI repository](https://github.com/sid0791/Health_AI_V1)
2. Click the green **"Code"** button
3. Select **"Codespaces"** tab
4. Click **"Create codespace on main"**

The setup will automatically:

- Install Node.js, pnpm, and all dependencies
- Configure demo environment files
- Set up port forwarding for all services
- Build the application

### 2. Start the Application

Once the codespace is ready:

```bash
# Start all services (recommended)
pnpm run dev

# Or start individual services:
# Web app only
cd apps/web && pnpm run dev

# Backend API only
cd services/backend && pnpm run start:dev
```

### 3. Access Your Application

The application will automatically open in your browser, or you can access:

- **🌐 Web App**: `http://localhost:3000` (auto-opens)
- **🔧 Backend API**: `http://localhost:8080`
- **📚 API Documentation**: `http://localhost:8080/api/docs`
- **⚡ n8n Workflows**: `http://localhost:5678`

## 📱 Application Features & Testing Guide

### Core Features You Can Test

#### 1. **User Authentication & Onboarding**

- **What to test**: Sign up, login, profile setup
- **URL**: `http://localhost:3000/auth/login`
- **Demo accounts**: The app runs in demo mode with mock authentication

#### 2. **AI-Powered Meal Planning**

- **What to test**: Generate meal plans, swap meals, nutrition tracking
- **URL**: `http://localhost:3000/meal-plan`
- **Features**:
  - Personalized meal recommendations
  - Dietary preference customization
  - Nutritional analysis
  - Meal swapping and alternatives

#### 3. **AI Health Chat Assistant**

- **What to test**: Health-related questions, personalized advice
- **URL**: `http://localhost:3000/chat`
- **Features**:
  - Real-time AI chat (demo responses)
  - Health-focused conversation
  - Contextual recommendations
  - Domain restriction (health-only topics)

#### 4. **Fitness Planning**

- **What to test**: Workout recommendations, exercise tracking
- **URL**: `http://localhost:3000/fitness`
- **Features**:
  - Personalized workout plans
  - Exercise library
  - Progress tracking
  - Fitness goal setting

#### 5. **Health Analytics & Reports**

- **What to test**: View health metrics, progress tracking
- **URL**: `http://localhost:3000/analytics`
- **Features**:
  - Visual health dashboards
  - Progress charts
  - Health trend analysis
  - Goal tracking

#### 6. **Food Logging**

- **What to test**: Log meals, scan food items
- **URL**: `http://localhost:3000/food-log`
- **Features**:
  - Manual food entry
  - Photo-based food logging (demo)
  - Nutritional analysis
  - Daily tracking

## 🧪 User Testing Scenarios

### Scenario 1: New User Onboarding

1. Visit `http://localhost:3000`
2. Click "Sign Up" or "Get Started"
3. Complete the onboarding flow
4. Set up your health profile
5. Explore personalized recommendations

### Scenario 2: Meal Planning Workflow

1. Navigate to "Meal Planning"
2. Generate a personalized meal plan
3. Try swapping meals you don't like
4. View nutritional information
5. Save meals to your plan

### Scenario 3: AI Chat Interaction

1. Go to "AI Assistant" or "Chat"
2. Ask health-related questions like:
   - "What should I eat for breakfast?"
   - "How can I improve my sleep?"
   - "What exercises are good for back pain?"
3. Test domain restrictions by asking non-health questions

### Scenario 4: Health Data Analysis

1. Navigate to "Analytics" or "Dashboard"
2. View your health metrics
3. Check progress charts
4. Set and modify health goals

## 🔧 Development & Testing Tools

### API Testing

- **Swagger UI**: `http://localhost:8080/api/docs`
- Test all backend endpoints directly
- View API schemas and responses

### Database Management

- Demo mode uses in-memory storage
- No external database setup required

### Log Monitoring

```bash
# View backend logs
cd services/backend && pnpm run start:dev

# View web app logs
cd apps/web && pnpm run dev
```

## 🎯 What You Can Expect

### ✅ Fully Working Features

- Web application UI and navigation
- Authentication flows (demo mode)
- AI chat interface with mock responses
- Meal planning interface
- Health analytics dashboard
- Responsive design (mobile-friendly)

### 🔧 Demo/Mock Features

- AI responses (using mock data instead of real API calls)
- Authentication (bypasses real OAuth providers)
- External integrations (weather, fitness trackers)
- Push notifications (simulated)

### 📱 Mobile Experience

- Responsive web design works on mobile
- iOS/Android native apps require Xcode/Android Studio (not in Codespaces)

## 🚀 Advanced Usage

### Running with Real APIs

To test with real AI providers:

1. Edit `services/backend/.env`
2. Replace demo API keys with real ones:
   ```env
   OPENAI_API_KEY=your-real-openai-key
   ANTHROPIC_API_KEY=your-real-anthropic-key
   ```
3. Set `USE_MOCK_AI_RESPONSES=false`
4. Restart the backend

### Custom Configuration

- Modify environment files in `services/backend/.env` and `apps/web/.env.local`
- Restart services to apply changes

## 🐛 Troubleshooting

### Quick Verification

```bash
# Run the verification script to check your setup
./verify-codespace.sh
```

### Common Issues

#### Port Already in Use

```bash
# Kill processes using ports
pkill -f "next dev"
pkill -f "nest start"
```

#### Dependencies Issues

```bash
# Clear and reinstall
rm -rf node_modules
pnpm install
```

#### Build Errors

```bash
# Clean build
pnpm run clean
pnpm run build
```

#### Setup Script Issues

```bash
# If codespace setup fails, try manual setup
npm install -g pnpm
pnpm install
./.devcontainer/setup.sh
```

#### Environment Issues

- Check `.env` files are created correctly
- Ensure no sensitive keys are committed (using demo keys only)
- Run `./verify-codespace.sh` to validate environment variables

### Getting Help

1. Run `./verify-codespace.sh` first for automated diagnostics
2. Check the console logs in browser developer tools
3. Review terminal output for error messages
4. Check if all ports are properly forwarded in Codespaces
5. Ensure the auto-setup script completed successfully

## 📊 Performance Tips

- **Codespace specs**: Use 4-core or higher for best performance
- **Browser**: Chrome/Edge recommended for best compatibility
- **Network**: Stable internet connection for smooth AI interactions

## 🔒 Security Notes

- **Demo mode**: All API keys are placeholders for security
- **Production**: Never commit real API keys to the repository
- **Codespaces**: Automatically handles port security and access

## 📖 Additional Resources

- **Architecture**: See `ARCHITECTURE.md` for technical details
- **API Documentation**: Available at `http://localhost:8080/api/docs` when
  running
- **User Guide**: See `USER_GUIDE.md` for local development setup
- **Contributing**: See `CONTRIBUTING.md` for development guidelines

## 🎉 Ready to Test!

Your HealthCoach AI application is now running and ready for interactive
testing. You can:

1. **Browse the application** like a real user
2. **Test all features** in real-time
3. **Interact with the AI** (demo responses)
4. **Experience the UI/UX** across different screens
5. **Test responsive design** on different viewport sizes

Enjoy exploring your AI-powered health application! 🏃‍♀️💪🥗
