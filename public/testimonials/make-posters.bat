@echo off
cd /d "%~dp0"
if not exist "posters" mkdir posters

dir /b *.mp4 > nul 2>&1
if errorlevel 1 (
    echo No .mp4 files found in this folder.
    pause
    exit /b
)

for %%f in (*.mp4) do (
    echo.
    echo === Processing: %%~nxf ===
    ffmpeg -y -ss 00:00:02 -i "%%f" -vframes 1 -q:v 2 "posters\%%~nf.jpg"
)
echo.
echo Done.
pause