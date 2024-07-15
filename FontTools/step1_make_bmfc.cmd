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

rem tools path
call include.cmd
if errorlevel 1 (
    echo [ERROR] Failed to include tools path from include.cmd
    goto eof
)

rem prepare dirs
echo.
echo [LOG] Preparing directories...
echo.
if not exist generated_fonts mkdir generated_fonts
if errorlevel 1 (
    echo [ERROR] Failed to create directory: generated_fonts
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
if exist generated_fonts\*.bmfc del /q /f generated_fonts\*.bmfc >nul
if exist generated_fonts\*.fnt del /q /f generated_fonts\*.fnt >nul
if exist generated_fonts\*.tga del /q /f generated_fonts\*.tga >nul
if exist generated_fonts\*.png del /q /f generated_fonts\*.png >nul
if exist generated_fonts\*.abc del /q /f generated_fonts\*.abc >nul
echo.
echo [LOG OK] Old results are cleared.
echo.

rem generate config for BMFont
echo.
echo [LOG] Generating BMFont config files...
echo.
%LUA% lua\generate_bmfc_x4.lua
if errorlevel 1 (
    echo [ERROR] Failed to generate .bmfc files using generate_bmfc_x4.lua
    goto eof
)
echo.
echo [LOG OK] .bmfc files are generated.
echo.

rem run BMFont
echo.
echo [LOG] Processing .bmfc files using BMFont...
echo.
for %%i in (generated_fonts\*.bmfc) do (
    echo Processing %%i...
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
pause
