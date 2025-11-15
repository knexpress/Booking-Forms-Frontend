@echo off
echo ========================================
echo Cleaning up Virtual Environment
echo ========================================
echo.

REM Deactivate virtual environment if active
if defined VIRTUAL_ENV (
    echo Deactivating virtual environment...
    deactivate
)

REM Remove venv directory
if exist venv (
    echo Removing venv directory...
    rmdir /s /q venv
    echo ✓ venv directory removed
) else (
    echo No venv directory found
)

REM Remove Python cache files
if exist __pycache__ (
    echo Removing __pycache__ directories...
    for /d /r . %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d"
    echo ✓ __pycache__ directories removed
)

REM Remove .pyc files
echo Removing .pyc files...
for /r . %%f in (*.pyc) do del /q "%%f"
echo ✓ .pyc files removed

echo.
echo ========================================
echo Cleanup complete!
echo ========================================
echo.
pause

