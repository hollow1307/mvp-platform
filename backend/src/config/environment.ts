import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

export const config = {
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || './data/platform.db',
  
  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
  
  // Session
  sessionSecret: process.env.SESSION_SECRET || 'fallback_secret_change_this_in_production',
  
  // Steam API
  steamApiKey: process.env.STEAM_API_KEY || '',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Validation
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Валидация обязательных переменных в продакшене
if (config.isProduction) {
  const requiredVars = ['SESSION_SECRET', 'STEAM_API_KEY'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
  }
}

export default config;

