@echo off
echo.
echo "|   __   ______ _ ___ _____   ____   __   _  __  __ __  __ _____ ___   __ |"
echo "| /' _/ / _/ _ \ | _,\_   _| |  \ `v' /  | |/__\|  V  |/  \_   _| \ \_/ / |"
echo "| `._`.| \_| v / | v_/ | |   | -<`. .'   | | \/ | \_/ | /\ || | | |> , <  |"
echo "| |___/ \__/_|_\_|_|   |_|   |__/ !_!    |_|\__/|_| |_|_||_||_| |_/_/ \_\ |"
echo "|  _________________________________________________________________________ |"
echo "| )___)___)___)___)___)___)___)___)___)___)___)___)___)___)___)____)___/___/ |"
echo "| /___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(  |"
echo.

REM -----------------------------------------------------------------------------
REM gen_stubs.bat
REM -----------------------------------------------------------------------------
REM Wrapper to invoke the PowerShell stub generator for X4 Lua API.
REM Places the generated x4_api_stubs.lua in your scripts folder.
REM -----------------------------------------------------------------------------

REM Path to the unpacked X4 scripts directory (relative to this .bat file)
set "UNPACKED_DIR=_unpacked"

REM Path to the output stub file
set "OUTPUT_STUB=_stubs\x4_api_stubs.lua"

echo.
echo Processing X4 Lua API stubs...
echo It may take a while, please be patient.
echo.

REM Call the PowerShell script with bypassed execution policy
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0generate_x4_stubs.ps1" ^
    -UnpackedDir "%~dp0%UNPACKED_DIR%" ^
    -OutputFile  "%~dp0%OUTPUT_STUB%"

echo.
echo Unpacked directory: %~dp0%UNPACKED_DIR%
echo Output stub file: %~dp0%OUTPUT_STUB%
echo.

pause