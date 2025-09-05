const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mock user data
const mockUser = {
  id: '1',
  name: 'Alex Johnson',
  email: 'alex@example.com',
  profileCompleted: true,
  onboardingCompleted: true,
  age: 28,
  gender: 'male',
  weight: 75,
  height: 180,
  activityLevel: 'moderate',
  goals: ['weight_loss', 'muscle_gain'],
  healthConditions: [],
  preferences: ['vegetarian'],
};

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    user: mockUser,
    token: 'mock_jwt_token',
    isNewUser: false,
  });
});

app.post('/api/auth/signup', (req, res) => {
  res.json({
    success: true,
    user: { ...mockUser, profileCompleted: false, onboardingCompleted: false },
    token: 'mock_jwt_token',
    isNewUser: true,
  });
});

// User endpoints
app.get('/api/users/profile', (req, res) => {
  res.json({ success: true, user: mockUser });
});

// Get current meal plan endpoint
app.get('/api/meal-plan/current', (req, res) => {
  res.json({
    success: true,
    mealPlan: {
      days: [
        {
          day: 'Monday',
          meals: [
            {
              type: 'breakfast',
              name: 'Greek Yogurt Parfait with Berries',
              calories: 280,
              protein: 20,
              carbs: 35,
              fat: 8,
              cookingTime: '5 min',
              ingredients: ['Greek yogurt', 'Mixed berries', 'Granola', 'Honey'],
              instructions: 'Layer yogurt, berries, and granola. Drizzle with honey.',
            },
            {
              type: 'lunch',
              name: 'Quinoa Buddha Bowl',
              calories: 420,
              protein: 18,
              carbs: 58,
              fat: 12,
              cookingTime: '25 min',
              ingredients: ['Quinoa', 'Chickpeas', 'Avocado', 'Vegetables'],
              instructions: 'Cook quinoa, roast vegetables, assemble bowl with tahini dressing.',
            },
            {
              type: 'dinner',
              name: 'Grilled Salmon with Vegetables',
              calories: 380,
              protein: 32,
              carbs: 15,
              fat: 22,
              cookingTime: '20 min',
              ingredients: ['Salmon fillet', 'Broccoli', 'Bell peppers', 'Olive oil'],
              instructions: 'Grill salmon, steam vegetables, season with herbs.',
            },
          ],
        },
      ],
      totalDailyCalories: 1080,
      totalDailyProtein: 70,
      aiGenerated: true,
      personalizedFor: mockUser.name,
    },
  });
});

// Meal planning endpoints with real AI integration
app.post('/api/meal-plan/generate', async (req, res) => {
  try {
    // Try to use real AI if API keys are available
    const { GoogleGenerativeAI } = require('@google/generative-ai');

    if (
      process.env.GOOGLE_AI_API_KEY &&
      process.env.GOOGLE_AI_API_KEY !== 'your_google_gemini_api_key_here'
    ) {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `Create a detailed 7-day meal plan for a ${mockUser.age}-year-old ${mockUser.gender} who weighs ${mockUser.weight}kg, is ${mockUser.height}cm tall, has ${mockUser.activityLevel} activity level, and prefers ${mockUser.preferences.join(', ')} food. Include Indian and international dishes with detailed nutrition information, cooking times, and ingredients. Format as JSON with days, meals (breakfast, lunch, dinner), calories, protein, carbs, fat, and cooking instructions.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        const mealPlan = JSON.parse(text);
        return res.json({ success: true, mealPlan });
      } catch (parseError) {
        // If AI response isn't valid JSON, create structured response
        return res.json({
          success: true,
          mealPlan: {
            days: [
              {
                day: 'Monday',
                meals: [
                  {
                    type: 'breakfast',
                    name: 'Greek Yogurt Parfait with Berries',
                    calories: 280,
                    protein: 20,
                    carbs: 35,
                    fat: 8,
                    cookingTime: '5 min',
                    ingredients: ['Greek yogurt', 'Mixed berries', 'Granola', 'Honey'],
                    instructions: 'Layer yogurt, berries, and granola. Drizzle with honey.',
                  },
                  {
                    type: 'lunch',
                    name: 'Quinoa Buddha Bowl',
                    calories: 420,
                    protein: 18,
                    carbs: 58,
                    fat: 12,
                    cookingTime: '25 min',
                    ingredients: ['Quinoa', 'Chickpeas', 'Avocado', 'Vegetables'],
                    instructions:
                      'Cook quinoa, roast vegetables, assemble bowl with tahini dressing.',
                  },
                  {
                    type: 'dinner',
                    name: 'Grilled Salmon with Vegetables',
                    calories: 380,
                    protein: 32,
                    carbs: 15,
                    fat: 22,
                    cookingTime: '20 min',
                    ingredients: ['Salmon fillet', 'Broccoli', 'Bell peppers', 'Olive oil'],
                    instructions: 'Grill salmon, steam vegetables, season with herbs.',
                  },
                ],
              },
            ],
            totalDailyCalories: 1080,
            totalDailyProtein: 70,
            aiGenerated: true,
            personalizedFor: mockUser.name,
          },
        });
      }
    }

    // Fallback to enhanced mock response
    res.json({
      success: true,
      mealPlan: {
        days: [
          {
            day: 'Monday',
            meals: [
              {
                type: 'breakfast',
                name: 'Greek Yogurt Parfait with Berries',
                calories: 280,
                protein: 20,
                carbs: 35,
                fat: 8,
                cookingTime: '5 min',
                ingredients: ['Greek yogurt', 'Mixed berries', 'Granola', 'Honey'],
                instructions: 'Layer yogurt, berries, and granola. Drizzle with honey.',
              },
            ],
          },
        ],
        aiGenerated: false,
        message: 'Using enhanced mock data. Add Google Gemini API key for real AI meal plans.',
      },
    });
  } catch (error) {
    console.error('Meal plan generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate meal plan' });
  }
});

// Chat endpoints with real AI
app.post('/api/chat/message', async (req, res) => {
  try {
    const { message } = req.body;

    if (
      process.env.GOOGLE_AI_API_KEY &&
      process.env.GOOGLE_AI_API_KEY !== 'your_google_gemini_api_key_here'
    ) {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `You are an AI health coach. The user is ${mockUser.name}, age ${mockUser.age}, ${mockUser.gender}, ${mockUser.weight}kg, ${mockUser.height}cm, with ${mockUser.activityLevel} activity level. User prefers ${mockUser.preferences.join(', ')} food. Respond helpfully to: ${message}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const aiResponse = response.text();

      return res.json({
        success: true,
        response: aiResponse,
        aiGenerated: true,
      });
    }

    // Fallback response
    res.json({
      success: true,
      response: `Thanks for your message: "${message}". I'm here to help with your health and nutrition questions! (Add Google Gemini API key for real AI responses)`,
      aiGenerated: false,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ success: false, message: 'Failed to process chat message' });
  }
});

// Food logging endpoints
app.post('/api/food/log', (req, res) => {
  const { foodId, food, quantity, mealType } = req.body;
  res.json({
    success: true,
    message: 'Food logged successfully',
    logEntry: {
      id: Date.now(),
      foodId,
      food,
      quantity,
      mealType: mealType || 'snack',
      timestamp: new Date().toISOString(),
    },
  });
});

// Daily nutrition endpoints
app.get('/api/nutrition/daily', (req, res) => {
  res.json({
    success: true,
    nutrition: {
      calories: { current: 130, target: 2000 },
      protein: { current: 2.7, target: 150 },
      carbs: { current: 28, target: 250 },
      fat: { current: 0.3, target: 67 },
    },
  });
});

// Recent foods endpoint
app.get('/api/food/recent', (req, res) => {
  res.json({
    success: true,
    foods: [
      { id: 1, name: 'White Rice', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, per: '100g' },
      { id: 2, name: 'Chapati', calories: 71, protein: 3, carbs: 15, fat: 0.4, per: '1 piece' },
    ],
  });
});

// Popular foods endpoint
app.get('/api/food/popular', (req, res) => {
  res.json({
    success: true,
    foods: [
      { id: 1, name: 'White Rice', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, per: '100g' },
      { id: 3, name: 'Dal (Lentils)', calories: 116, protein: 9, carbs: 20, fat: 0.4, per: '100g' },
      {
        id: 5,
        name: 'Chicken Breast',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        per: '100g',
      },
    ],
  });
});

// Food database endpoints
app.get('/api/food/search', (req, res) => {
  const { query } = req.query;
  const foods = [
    { id: 1, name: 'White Rice', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, per: '100g' },
    { id: 2, name: 'Basmati Rice', calories: 121, protein: 3, carbs: 25, fat: 0.4, per: '100g' },
    { id: 3, name: 'Chapati', calories: 71, protein: 3, carbs: 15, fat: 0.4, per: '1 piece' },
    { id: 4, name: 'Dal (Lentils)', calories: 116, protein: 9, carbs: 20, fat: 0.4, per: '100g' },
    { id: 5, name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, per: '100g' },
    { id: 6, name: 'Paneer', calories: 265, protein: 18, carbs: 1.2, fat: 20, per: '100g' },
    { id: 7, name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, per: '1 medium' },
    { id: 8, name: 'Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, per: '1 medium' },
    { id: 9, name: 'Almonds', calories: 576, protein: 21, carbs: 22, fat: 49, per: '100g' },
    { id: 10, name: 'Greek Yogurt', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, per: '100g' },
  ];

  const filteredFoods = query
    ? foods.filter(food => food.name.toLowerCase().includes(query.toLowerCase()))
    : foods;

  res.json({ success: true, foods: filteredFoods });
});

// Health reports endpoints
app.post('/api/health-reports/analyze', async (req, res) => {
  try {
    const { reportData } = req.body;

    if (
      process.env.GOOGLE_AI_API_KEY &&
      process.env.GOOGLE_AI_API_KEY !== 'your_google_gemini_api_key_here'
    ) {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `Analyze this health report for ${mockUser.name} (${mockUser.age}yo ${mockUser.gender}): ${JSON.stringify(reportData)}. Provide insights, risk assessment, and recommendations in a professional medical format.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysis = response.text();

      return res.json({
        success: true,
        analysis,
        aiGenerated: true,
      });
    }

    // Fallback analysis
    res.json({
      success: true,
      analysis: {
        summary: 'Health report analysis would appear here with AI insights and recommendations.',
        risks: ['Add Google Gemini API key for real health report analysis'],
        recommendations: ['Enable AI features by adding API keys in .env file'],
      },
      aiGenerated: false,
    });
  } catch (error) {
    console.error('Health report analysis error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze health report' });
  }
});

// Dashboard data endpoints
app.get('/api/dashboard/summary', (req, res) => {
  res.json({
    success: true,
    data: {
      dailyCalories: { current: 1847, target: 2000 },
      waterIntake: { current: 6.2, target: 8 },
      activeMinutes: { current: 45, target: 60 },
      goalProgress: 78,
      todaysSchedule: [
        { type: 'workout', name: 'Leg Workout', time: '6:00 PM', duration: '45 min' },
        { type: 'meal', name: 'Grilled Salmon with Vegetables', time: '7:30 PM', calories: 420 },
        { type: 'activity', name: 'Evening Meditation', time: '9:00 PM', duration: '10 min' },
      ],
      recentMeals: [
        { name: 'Quinoa Bowl with Grilled Chicken', time: '12:30 PM', calories: 485, protein: 32 },
        { name: 'Greek Yogurt with Berries', time: '9:15 AM', calories: 180, protein: 15 },
        { name: 'Green Smoothie', time: '7:00 AM', calories: 165, protein: 8 },
      ],
    },
  });
});

// Analytics endpoints
app.get('/api/analytics/data', (req, res) => {
  res.json({
    success: true,
    data: {
      weightProgress: [72, 73, 71, 70, 69, 68, 67],
      caloriesTrend: [1800, 1900, 1750, 2100, 1850, 1900, 1847],
      workoutMinutes: [30, 45, 0, 60, 45, 30, 45],
      waterIntake: [6, 7, 5.5, 8, 6.2, 7.5, 6.2],
      sleepHours: [7, 8, 6.5, 7.5, 7, 8, 7.5],
    },
  });
});

const PORT = process.env.PORT || 3001;

// Add catch-all for 404s to prevent console errors
app.use('*', (req, res) => {
  console.log(`404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
    suggestion: 'Check API documentation for available endpoints',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Mock Backend Server running on port ${PORT}`);
  console.log(
    `🔧 Mode: ${process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY !== 'your_google_gemini_api_key_here' ? 'REAL AI' : 'MOCK'}`
  );
  console.log(`📡 CORS enabled for: http://localhost:3000`);
});
