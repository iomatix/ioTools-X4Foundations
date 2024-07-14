@echo off

rem tools path
call include.cmd

rem clear old results
if exist fonts_new\*.abc del /q /f fonts_new\*.abc

rem convert font descriptors
%LUA% lua\generate_abc.lua
echo.
echo [LOG OK] font descriptors are ready.
echo.

:eof
pause
