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


rem tools path
call include.cmd

rem clear old results
if exist generated_fonts\*.abc del /q /f generated_fonts\*.abc 


rem convert font descriptors
%LUA% lua\generate_abc_x4.lua
echo.
echo [LOG OK] font descriptors are ready.
echo [LOG OK] .abc files are created.
echo.


rem use ImageMagick to generate signed distance fields and scale it
call magick_image.bat "%%i"

echo.
echo [LOG OK] .png files has been processed.
echo [!!!!!!] If any *_01.png exists, then
echo [!!!!!!] tune up config_fonts.lua and rerun this script.
echo.



:eof
pause
