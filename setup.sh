#!/bin/bash

# Translated Movies Backend Setup Script

echo "🎬 Setting up Translated Movies Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first."
    echo "   You can start it with: mongod"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env 2>/dev/null || echo "Please create .env file with your configuration"
fi

# Create logs directory
mkdir -p logs

echo "✅ Setup complete!"
echo ""
echo "🚀 To start the development server:"
echo "   npm run dev"
echo ""
echo "🌱 To seed the database with sample data:"
echo "   npm run seed"
echo ""
echo "🐳 To run with Docker:"
echo "   docker-compose up -d"
echo ""
echo "📚 Check API_DOCS.md for API documentation"
echo "📝 Check README.md for detailed information"
