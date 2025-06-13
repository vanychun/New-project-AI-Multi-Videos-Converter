#!/bin/bash

# AI Multi Videos Converter Backend Startup Script

echo "🚀 Starting AI Multi Videos Converter Backend Server..."
echo "=================================================="

# Change to backend directory
cd "$(dirname "$0")/ai-backend"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Please create it first: python -m venv venv"
    exit 1
fi

# Activate virtual environment
echo "📦 Activating virtual environment..."
source venv/bin/activate

# Check if FastAPI is installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "⚙️ Installing dependencies..."
    pip install -r requirements.txt
fi

# Start the server
echo "🌐 Starting server on http://127.0.0.1:8001"
echo "📖 API docs available at http://127.0.0.1:8001/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================================="

python app.py