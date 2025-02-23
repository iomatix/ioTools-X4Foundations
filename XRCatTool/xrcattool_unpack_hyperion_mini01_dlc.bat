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

setlocal

:: Set the input files (adjust as needed)
set "input_files=extensions\ego_dlc_mini_01\ext_01.cat extensions\ego_dlc_mini_01\ext_02.cat extensions\ego_dlc_mini_01\ext_03.cat"

:: Set the output directory to the current working directory
set "output_dir=%~dp0_unpacked\_extensions\ego_dlc_mini_01"

:: Create the output directory if it doesn't exist
if not exist "%output_dir%" mkdir "%output_dir%"

echo.
:: Run the XRCatTool.exe command
"%XRCATTOOL_PATH%" -in %input_files% -out "%output_dir%"

echo.
:: Check the exit code of the XRCatTool
if %errorlevel% equ 0 (
    echo Unpacking completed! Output files are in "%output_dir%"
) else (
    echo Unpacking didn't go well. Check for errors.
)

echo.
:: Exit the script
pause

endlocal