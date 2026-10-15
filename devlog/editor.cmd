@echo off
rem Devlog editor: opens http://127.0.0.1:5120 in your browser. Close this window to stop it.
python "%~dp0editor.py" %*
if errorlevel 1 pause
