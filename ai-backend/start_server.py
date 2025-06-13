#!/usr/bin/env python3
"""
Startup script for AI Multi Videos Converter Backend Server
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3.8, 0):
        print("❌ Python 3.8 or higher is required")
        return False
    print(f"✅ Python {sys.version.split()[0]} detected")
    return True

def activate_venv():
    """Check if virtual environment is activated"""
    venv_path = Path("venv")
    if not venv_path.exists():
        print("❌ Virtual environment not found")
        return False
    
    # Check if we're in the virtual environment
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("✅ Virtual environment is active")
        return True
    else:
        print("⚠️ Virtual environment is not active")
        print("Please activate it first:")
        if os.name == 'nt':  # Windows
            print("    venv\\Scripts\\activate")
        else:  # Unix/Linux/MacOS
            print("    source venv/bin/activate")
        return False

def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = ["fastapi", "uvicorn", "torch", "opencv-python"]
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
            print(f"✅ {package} is installed")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package} is missing")
    
    if missing_packages:
        print(f"\n⚠️ Missing packages: {', '.join(missing_packages)}")
        print("Install them with: pip install -r requirements.txt")
        return False
    
    return True

def start_server():
    """Start the FastAPI server"""
    print("\n🚀 Starting AI Multi Videos Converter Backend Server...")
    print("Server will be available at: http://127.0.0.1:8001")
    print("API documentation at: http://127.0.0.1:8001/docs")
    print("\nPress Ctrl+C to stop the server\n")
    
    try:
        # Start the server
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "app:app", 
            "--host", "127.0.0.1", 
            "--port", "8001", 
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")

def main():
    """Main function"""
    print("=== AI Multi Videos Converter Backend Server ===\n")
    
    # Check system requirements
    if not check_python_version():
        sys.exit(1)
    
    if not activate_venv():
        sys.exit(1)
    
    if not check_dependencies():
        print("\n💡 To install missing dependencies:")
        print("1. Make sure virtual environment is activated")
        print("2. Run: pip install -r requirements.txt")
        sys.exit(1)
    
    print("\n✅ All checks passed!")
    
    # Start the server
    start_server()

if __name__ == "__main__":
    main()