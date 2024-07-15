@echo off
setlocal

echo.
echo "|   __   ______ _ ___ _____   ____   __   _  __  __ __  __ _____ ___   __ |"
echo "| /' _/ / _/ _ \ | _,\_   _| |  \ `v' /  | |/__\|  V  |/  \_   _| \ \_/ / |"
echo "| `._`.| \_| v / | v_/ | |   | -<`. .'   | | \/ | \_/ | /\ || | | |> , <  |"
echo "| |___/ \__/_|_\_|_|   |_|   |__/ !_!    |_|\__/|_| |_|_||_||_| |_/_/ \_\ |"
echo "|  _________________________________________________________________________ |"
echo "| )___)___)___)___)___)___)___)___)___)___)___)___)___)___)___)____)___/___/ |"
echo "| /___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(  |"
echo.

:: Set tools path
call include.cmd
if errorlevel 1 (
    echo [ERROR] Failed to include tools path from include.cmd
    goto eof
)

:: Prepare dirs
echo.
echo [LOG] Preparing directories...
if not exist %FOLDER% mkdir %FOLDER%
if errorlevel 1 (
    echo [ERROR] Failed to create directory: %FOLDER%
    goto eof
)
if not exist %FOLDER%\mods\%TARGET% mkdir %FOLDER%\mods\%TARGET%
if errorlevel 1 (
    echo [ERROR] Failed to create directory: %TARGET% within the mods directory.
    goto eof
)
echo.
echo [LOG OK] Working directories exist.


:: Clean old results
echo.
echo [LOG] Clearing directories...
for /r %FOLDER% %%R in (*.bmfc *.fnt *.tga *.png *.abc *.dds *.cat *.dat) do (
    if exist "%%R" (
        echo [LOG] Removing %%R...
        del /q /f "%%R" >nul
        echo [LOG OK] %%R is removed.
    )
    if errorlevel 1 (
        echo [ERROR] Failed to prepare directory: %FOLDER%.
        goto eof
    )
)
echo.
echo [LOG OK] Old results are cleared from %FOLDER%.

:: Generate config for BMFont
echo.
echo [LOG] Generating BMFont config files...
%LUA% lua\generate_bmfc_x4.lua
if errorlevel 1 (
    echo [ERROR] Failed to generate .bmfc files using generate_bmfc_x4.lua
    goto eof
)
echo.
echo [LOG OK] .bmfc files are generated.

:: Run BMFont
echo.
echo [LOG] Processing .bmfc files using BMFont...
for %%i in (%FOLDER%\*.bmfc) do (
    echo [LOG] Processing "%%~dpni"
    %BMFONT% -c "%%i" -o "%%~dpni"
    if errorlevel 1 (
        echo [ERROR] Failed to process "%%i" with BMFont
        goto eof
    )
    echo.
)
echo.
echo [LOG OK] .fnt and .png files are created.
echo [WARNING] If any *_01.png exists, then tune up config_fonts.lua and rerun this script.
echo [WARNING] There should be only one page of texture per each font file.
echo [WARNING] If any other problems occure, please check .bmfc manually using BMFont software.
echo.

echo.
echo [SUCCESS] Step 1 has been completed successfully!
echo [WARNING] Please, check the WARNING messages.

:eof
endlocal
