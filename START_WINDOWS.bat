@echo off
cd /d "%~dp0"
start "" http://localhost:8787
where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server 8787
) else (
  python -m http.server 8787
)
