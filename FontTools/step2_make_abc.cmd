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

rem clear old results
echo.
echo [LOG] Clearing old .abc files...
echo.
if exist generated_fonts\*.abc del /q /f generated_fonts\*.abc 


rem convert font descriptors
echo.
echo [LOG] Converting font descriptors...
echo.
%LUA% lua\generate_abc_x4.lua
echo.
echo [LOG OK] font descriptors are ready.
echo [LOG OK] .abc files are created.
echo.


rem use ImageMagick to generate signed distance fields and scale it
echo.
echo [LOG] Calling ImageMagick script to generate signed distance fields and scale it...
echo.
call magick_image.bat "%%i"
if errorlevel 1 (
        echo [ERROR] Failed to generate signed distance fields.
        echo [WARNING] The font won't work in X4 without signed distance fields. 
        echo [WARNING] This step is mandatory and can not be skipped.
        goto eof
    )

echo.
echo [LOG OK] .png files has been processed.
echo [WARNING] If any *_01.png exists, then tune up config_fonts.lua and rerun scripts begining at step1 script.
echo [WARNING] There should be only one page of texture per each font file.
echo [WARNING] If any other problems occure, please check .bmfc manually using BMFont software.
echo.

echo.
echo [SUCCESS] Step 2 has been completed successfully!
echo [WARNING] Please, check the WARNING messages.
:eof
pause
