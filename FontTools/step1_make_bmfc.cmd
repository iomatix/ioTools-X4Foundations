@echo off
setlocal enabledelayedexpansion

rem tools path
call include.cmd
if errorlevel 1 (
    echo [ERROR] Failed to include tools path from include.cmd
    goto eof
)

rem prepare dirs
if not exist fonts_new mkdir fonts_new
if errorlevel 1 (
    echo [ERROR] Failed to create directory: fonts_new
    goto eof
)
if not exist mod\assets\fx\gui\fonts\textures mkdir mod\assets\fx\gui\fonts\textures
if errorlevel 1 (
    echo [ERROR] Failed to create directory: mod\assets\fx\gui\fonts\textures
    goto eof
)
echo.
echo [LOG OK] Working directories are created.
echo.

rem clear old results
if exist fonts_new\*.bmfc del /q /f fonts_new\*.bmfc >nul
if exist fonts_new\*.fnt del /q /f fonts_new\*.fnt >nul
if exist fonts_new\*.tga del /q /f fonts_new\*.tga >nul
echo.
echo [LOG OK] Old results are cleared.
echo.

rem generate config for BMFont
%LUA% lua\generate_bmfc.lua
if errorlevel 1 (
    echo [ERROR] Failed to generate .bmfc files using generate_bmfc.lua
    goto eof
)
echo.
echo [LOG OK] .bmfc files are generated.
echo.

rem run BMFont
for %%i in (fonts_new\*.bmfc) do (
    echo Processing %%i...
    %BMFONT% -c "%%i" -o "%%~dpni"
    if errorlevel 1 (
        echo [ERROR] Failed to process %%i with BMFont
        goto eof
    )
    echo.
)
echo.
echo [LOG OK] .fnt and .tga files are created.
echo [!!!!!!] If any *_01.tga exists, then
echo [!!!!!!] tune up config_fonts.lua and rerun this script.
echo.

:eof
pause
