@echo off

rem tools path
call include.cmd
if errorlevel 1 (
    echo [ERROR] Failed to include tools path from include.cmd
    goto eof
)

rem calculate md5 and packing
echo.
echo [LOG] Calculating md5 for files in the folder...
echo.
cd mod && %MD5DEEP% -r -z -l * > ..\mod.md5 && cd ..
echo.
echo [LOG] Packing of fonts in the %CATDAT%...
echo.
%LUA% lua\pack.lua mod.md5 %CATDAT% %OUTDIR%
if errorlevel 1 (
    echo [ERROR] Failed to pack files in the catalog...
    goto eof
)

echo.
echo [LOG] Cleaning up...
echo.
if exist mod.md5 del /q /f mod.md5 >nul
if errorlevel 1 (
    echo [ERROR] Failed to delete md5 file mod.md5
    goto eof
)
echo.
echo [LOG OK] fonts are packed, cat/dat is ready.
echo [WARNING] The pack is not compatible with the X4:Foundations...
echo [WARNING] This script was designed to generate files for X:Rebirth !
echo.

echo.
echo [SUCCESS] Step 4 has been completed successfully!
echo [WARNING] Please, check the WARNING messages.
echo.
:eof
pause
