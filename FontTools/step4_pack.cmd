@echo off

rem tools path
call include.cmd

rem calculate md5 and packing
cd mod && %MD5DEEP% -r -z -l * > ..\mod.md5 && cd ..
%LUA% lua\pack.lua mod.md5 %CATDAT% %OUTDIR%
if exist mod.md5 del /q /f mod.md5 >nul
echo.
echo [LOG OK] fonts are packed, cat/dat is ready.
echo.

:eof
pause
