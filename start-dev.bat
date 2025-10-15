@echo off
echo 🚀 Starting MVP Platform Development Environment...

echo.
echo 📦 Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)

echo.
echo 📦 Installing frontend dependencies...
cd ../frontend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)

echo.
echo 🔧 Setting up environment...
cd ../backend
if not exist .env (
    echo 📝 Creating .env file from template...
    copy env.example .env
    echo ✅ .env file created. Please edit it with your configuration.
)

echo.
echo 🚀 Starting backend server...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo.
echo 🚀 Starting frontend server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo ✅ Development environment started!
echo.
echo 🌐 Backend: http://localhost:5000
echo 🌐 Frontend: http://localhost:3000
echo.
echo 📝 Don't forget to:
echo    1. Edit backend/.env with your configuration
echo    2. Get Steam API key from https://steamcommunity.com/dev/apikey
echo.
pause


