@echo off
setlocal enabledelayedexpansion

echo.
echo "|   __   ______ _ ___ _____   ____   __   _  __  __ __  __ _____ ___   __ |"
echo "| /' _/ / _/ _ \ | _,\_   _| |  \ `v' /  | |/__\|  V  |/  \_   _| \ \_/ / |"
echo "| `._`.| \_| v / | v_/ | |   | -<`. .'   | | \/ | \_/ | /\ || | | |> , <  |"
echo "| |___/ \__/_|_\_|_|   |_|   |__/ !_!    |_|\__/|_| |_|_||_||_| |_/_/ \_\ |"
echo "|  _________________________________________________________________________ |"
echo "| )___)___)___)___)___)___)___)___)___)___)___)___)___)___)___)____)___/___/ |"
echo "| /___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(  |"
echo.


rem TODO: the tool is not working currently, md5 is unnecessary, packing with x4 TODO 
rem tools path
call include.cmd
if errorlevel 1 (
    echo [ERROR] Failed to include tools path from include.cmd
    goto eof
)

rem calculate md5 and packing TODO: delete
echo.
echo [LOG] Calculating md5 for files in the folder...
echo.
cd mod && %MD5DEEP% -r -z -l * > ..\mod.md5 && cd ..
echo.
echo [LOG] Packing of fonts in the %CATDAT%...
echo.
rem pack x4 to %CATDAT%, rename and pack to %CATDATSUBST%
%LUA% lua\pack_x4.lua mod.md5 %CATDAT% %OUTDIR%
if errorlevel 1 (
    echo [ERROR] Failed to pack files into the catalog...
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
echo [ERROR] This script is not ready yet!. TODO: this.
echo.
:eof
pause
