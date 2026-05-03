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
    ffmpeg -y -ss 0 -t 6 -i "%%f" -vf "fps=10,scale=480:-1:flags=lanczos" "posters\%%~nf.gif"
)
echo.
echo Done.
pause