// Main entry point for the Health AI API
import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/health', healthRouter);

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'Health AI API - Phase 0' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
