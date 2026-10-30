@echo off
REM Celestra: stop whatever is using the app ports, then start again.
cd /d "%~dp0"
for %%P in (8000 5173 5174 5175 5176) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do taskkill /PID %%A /T /F >nul 2>&1
)
timeout /t 2 /nobreak >nul
start "" /D "%~dp0" "%~dp0start.bat"
