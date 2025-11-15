@echo off
echo ========================================
echo Installing Visual C++ Redistributables
echo ========================================
echo.
echo This will fix PyTorch DLL errors on Windows
echo.

REM Download VC++ Redistributables
echo Downloading Visual C++ Redistributables...
powershell -Command "Invoke-WebRequest -Uri 'https://aka.ms/vs/17/release/vc_redist.x64.exe' -OutFile '%TEMP%\vc_redist.x64.exe'"

if exist "%TEMP%\vc_redist.x64.exe" (
    echo.
    echo Installing...
    echo Please follow the installation wizard
    echo.
    start /wait "" "%TEMP%\vc_redist.x64.exe" /install /quiet /norestart
    
    echo.
    echo ========================================
    echo Installation complete!
    echo ========================================
    echo.
    echo IMPORTANT: Please restart your computer for changes to take effect.
    echo After restart, try running: python app.py
    echo.
) else (
    echo.
    echo ERROR: Failed to download installer
    echo Please manually download from:
    echo https://aka.ms/vs/17/release/vc_redist.x64.exe
    echo.
)

pause

