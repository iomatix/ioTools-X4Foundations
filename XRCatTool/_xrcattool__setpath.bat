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


:: Check for administrator privileges
openfiles >nul 2>&1
if %errorlevel% neq 0 (
    echo This script requires administrative privileges. 
    echo Please run as an administrator...
    pause
    exit /b
)

setlocal

set "default_search_path=%~dp0..\X Tools"

echo.
echo Please enter the XRCatTool.exe directory path (Default: %default_search_path%):
set /p search_path=

echo.
:: Resolve to absolute path if relative
if not exist "%search_path%" (
    set "search_path=%default_search_path%"
    echo Invalid directory path specified.
    echo Trying with default path: %search_path%
)

pushd "%search_path%" >nul 2>&1
if %errorlevel% neq 0 (
    echo Invalid directory path specified.
    goto EndScript
)
for %%i in ("%cd%") do set "search_path=%%~fi"
popd >nul

echo.
echo The script is searching for XRCatTool.exe in "%search_path%".

set "absolute_path=%search_path%\XRCatTool.exe"

echo.
if exist "%absolute_path%" (
    echo File found at: %absolute_path%
    echo Setting up the system environment variable...
    setx /m XRCATTOOL_PATH "%absolute_path%"
    if %errorlevel% equ 0 (
        echo XRCatTool.exe found, and the system environment variable XRCATTOOL_PATH has been set.
    ) else (
        echo Failed to set the system environment variable. Do you have the required privileges?
    )
) else (
    echo XRCatTool.exe not found in the specified directory.
)

:EndScript
echo.
:: Exit the script
pause
endlocal