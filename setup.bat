@echo off
REM Translated Movies Backend Setup Script for Windows

echo 🎬 Setting up Translated Movies Backend...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Check if .env exists
if not exist .env (
    echo ⚙️  Please create .env file with your configuration
    echo Check .env section in README.md for required variables
)

REM Create logs directory
if not exist logs mkdir logs

echo ✅ Setup complete!
echo.
echo 🚀 To start the development server:
echo    npm run dev
echo.
echo 🌱 To seed the database with sample data:
echo    npm run seed
echo.
echo 🐳 To run with Docker:
echo    docker-compose up -d
echo.
echo 📚 Check API_DOCS.md for API documentation
echo 📝 Check README.md for detailed information

pause
