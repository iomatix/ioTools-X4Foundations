@echo off

rem tools path
call include.cmd

rem clear old results
if exist generated_fonts\*.abc del /q /f generated_fonts\*.abc

rem convert font descriptors
%LUA% lua\generate_abc_x4.lua
echo.
echo [LOG OK] font descriptors are ready.
echo.

:eof
pause
