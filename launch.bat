@echo off
REM Double-click launcher for the 8bitretro.tech local preview.
REM Frees a stuck port, serves the docs folder, and opens your browser at :8000.
cd /d "%~dp0"
echo Launching the 8bitretro.tech preview...
python app.py %*
pause
