@echo off
REM Celestra (development): API on port 8000, website on port 5173.
cd /d "%~dp0"
if not exist "backend\.venv\Scripts\python.exe" (
  echo backend\.venv not found. Run setup.bat first.
  pause
  exit /b 1
)
start "Celestra API" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
start "Celestra Web" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --port 5173 --strictPort"
timeout /t 4 >nul
start "" http://localhost:5173/
