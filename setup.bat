@echo off
REM Celestra first-time setup: Python packages, optional neural denoiser, website packages.
cd /d "%~dp0"
set PY=backend\.venv\Scripts\python.exe
set LOG=setup.log
if not exist "%PY%" (
  echo Creating backend\.venv ...
  python -m venv backend\.venv || (echo Python 3.12+ is required. & pause & exit /b 1)
)
echo Celestra setup %DATE% %TIME% > %LOG%

echo [1/5] Core packages...
%PY% -m pip install --disable-pip-version-check -r backend\requirements.txt >> %LOG% 2>&1
echo [2/5] Image science packages...
%PY% -m pip install --disable-pip-version-check -r backend\requirements-science.txt >> %LOG% 2>&1
echo [3/5] Neural denoiser (torch + deepinv, large download, optional)...
curl -sSL -o "%TEMP%\vc_redist.x64.exe" https://aka.ms/vs/17/release/vc_redist.x64.exe >> %LOG% 2>&1
"%TEMP%\vc_redist.x64.exe" /install /passive /norestart >> %LOG% 2>&1
%PY% -m pip install --disable-pip-version-check torch --index-url https://download.pytorch.org/whl/cpu >> %LOG% 2>&1
%PY% -m pip install --disable-pip-version-check deepinv >> %LOG% 2>&1
echo [4/5] Website packages...
pushd frontend
call npm install --no-audit --no-fund >> ..\%LOG% 2>&1
popd
echo [5/5] Checks...
%PY% -c "import fastapi, astronomy, skyfield; print('OK  core')" 2>> %LOG%
%PY% -c "import photutils, skimage, astropy; print('OK  image science')" 2>> %LOG%
%PY% -c "import torch, deepinv; print('OK  neural denoiser')" 2>nul || echo --  neural denoiser not installed (classical denoiser will be used)
echo.
echo Done. Run start.bat to open Celestra. Details: %LOG%
pause
