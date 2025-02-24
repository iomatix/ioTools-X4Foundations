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
echo.
echo ========================================================
echo Quick Guide: How to Use This Script for X4 Foundations
echo ========================================================
echo.
echo This script is designed to unpack .cat files from X4 Foundations
echo using XRCatTool. Here's how to use it:
echo.
echo 1. Prepare Your Files:
echo    - Ensure XRCatTool.exe is installed (e.g. via Steam: X Tools).
echo    - Run _xrcattool__setpath.bat at least once to set the path to XRCatTool.exe.
echo    - Place all .cat files or directories containing them 
echo      to be unpacked in the same folder as this script,
echo      or move this script to the folder containing your .cat files.
echo    - This script is not handling spaces from file paths from user input.
echo      Please avoid using spaces in file path, or create a file_list.txt
echo      containing relative path to one .cat file per line.
echo.
echo 2. Run the Script:
echo    - Double-click the script.
echo    - When prompted, enter the list of relative paths to .cat files (separated by spaces)
echo      or press ENTER to search for ALL .cat files recursively.
echo.
echo 3. Output:
echo    - Unpacked files will be saved in a folder named "_unpacked" alongside this script.
echo.
echo ========================================================
echo.

setlocal EnableDelayedExpansion

:: Set working directory to the script location
cd /d "%~dp0"

:: Set paths to be passed to Python script
set "current_dir=%~dp0"

:: Remove trailing backslash if present
if "%current_dir:~-1%"=="\" set "current_dir=%current_dir:~0,-1%"
set "output_dir=%~dp0_unpacked"

:: Create output directory if it doesn't exist
if not exist "%output_dir%" mkdir "%output_dir%"

:: Set the path to XRCatTool.exe
set "xrcattool_path=%XRCATTOOL_PATH%"

:start
:: Build list of file paths to pass to Python script
set "file_list="

:: Prompt for input files
set /p "input_files=Enter the list of input files (separated by spaces, or leave blank to unpack ALL .cat files or use file_list.txt): "

:: Check if input is empty
if "%input_files%"=="" (
    :: Check if file_list.txt exists
    if exist "file_list.txt" (
        echo Reading files from file_list.txt...
        for /f "usebackq delims=" %%f in ("file_list.txt") do (
            set "line=%%f"
            if "!line!" neq "" (
                if exist "!line!" (
                    if defined file_list (
                        set "file_list=!file_list! "!line!""
                    ) else (
                        set "file_list= "!line!""
                    )
                ) else (
                    echo File not found: !line!
                )
            )
        )
    ) else (
        :: If file_list.txt is not found, search for ALL .cat files
        echo No input files provided and file_list.txt not found. Searching for ALL .cat files...
        
        for /r %%f in (*.cat) do (
            set "filename=%%~nxf"
            set "last7=!filename:~-7!"
            if /i not "!last7!"=="sig.cat" (
                if defined file_list (
                    set "file_list=!file_list! "%%~f""
                ) else (
                    set "file_list="%%~f""
                )
            ) else (
                echo Excluding `sig` file: %%~nxf
            )
        )
    )
) else (
    :: Process the user-supplied list
    echo Analyzing user input...
    for %%f in (%input_files%) do (
        if exist "%%~f" (
            if defined file_list (
                set "file_list=!file_list! "%%~f""
            ) else (
                set "file_list="%%~f""
            )
        ) else (
            echo File not found: %%~f
        )
    )
)

:: Check if any files were found
if not defined file_list (
    echo.
    echo No valid files found. Please check your input and try again.
    echo. Revisit your input files or file_list.txt and try again.
    echo.
    goto :start
)

:list_of_files
echo.
echo List of files:
echo !file_list!
echo.
echo Make sure the list of files is correct and there are no
echo double quotes before proceeding with the unpacking process.
echo.
echo Do you want to proceed with the unpacking process? (Y/N)
set /p "choice="

:: Check the user's choice
if /i "%choice%" equ "N" (
    cls
    goto :start
) else (
    if /i "%choice%" equ "Y" (
        goto :continue
    ) else (
        cls
        goto :list_of_files
    )
)

:continue
echo Proceeding with unpacking...
echo Directing task to Python script...
echo.

echo Calling: python xrcat_unpacker.py "%current_dir%" "%output_dir%" "%xrcattool_path%" !file_list!
echo.

:: Call the Python script with parameters
python xrcat_unpacker.py "%current_dir%" "%output_dir%" "%xrcattool_path%" !file_list!

echo.
echo ====================== SUMMARY ======================
echo.
:: Check the exit code of the XRCatTool
if %errorlevel% equ 0 (
    echo Repacking completed! Output files are in "%output_dir%"
) else (
    echo Repacking didn't go well. Check for errors.
)

endlocal
pause