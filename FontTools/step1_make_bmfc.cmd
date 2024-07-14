@echo off

rem tools path
call include.cmd

rem prepare dirs
if not exist fonts_new mkdir fonts_new
if not exist mod\assets\fx\gui\fonts\textures mkdir mod\assets\fx\gui\fonts\textures
echo.
echo [LOG OK] working catalogs are created
echo.

rem clear old results
if exist fonts_new\*.bmfc del /q /f fonts_new\*.bmfc >nul
if exist fonts_new\*.fnt del /q /f fonts_new\*.fnt >nul
if exist fonts_new\*.tga del /q /f fonts_new\*.tga >nul

rem generate config for BMFont
%LUA% lua\generate_bmfc.lua
echo.
echo [LOG OK] .bmfc are generated
echo.

rem run BMFont
for %%i in (fonts_new\*.bmfc) do (
    echo %%i
    %BMFONT% -c "%%i" -o "%%~dpni"
    echo.
)
echo.
echo [LOG OK] .fnt and .tga created.
echo [!!!!!!] if any *_01.tga is exist then
echo [!!!!!!] tune up config_fonts.lua and rerun this script.
echo.

:eof
pause
