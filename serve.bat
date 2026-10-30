@echo off
REM Celestra production mode: builds the website once, then serves site + API on http://localhost:8000
cd /d "%~dp0"
if not exist "backend\.venv\Scripts\python.exe" (
  echo backend\.venv not found. Run setup.bat first.
  pause
  exit /b 1
)
pushd frontend
call npm run build || (popd & pause & exit /b 1)
popd
cd backend
.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
