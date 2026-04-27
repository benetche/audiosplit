@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0python-docker.ps1" %*
exit /b %ERRORLEVEL%
