@echo off
setlocal enabledelayedexpansion

echo.
echo "|   __   ______ _ ___ _____   ____   __   _  __  __ __  __ _____ ___   __
echo "| /' _/ / _/ _ \ | _,\_   _| |  \ `v' /  | |/__\|  V  |/  \_   _| \ \_/ /
echo "| `._`.| \_| v / | v_/ | |   | -<`. .'   | | \/ | \_/ | /\ || | | |> , < 
echo "| |___/ \__/_|_\_|_|   |_|   |__/ !_!    |_|\__/|_| |_|_||_||_| |_/_/ \_\
echo "|  _________________________________________________________________________
echo "| )___)___)___)___)___)___)___)___)___)___)___)___)___)___)___)____)___/___/
echo "| /___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(___( 
echo.
@echo off

rem Locate all XmlNotepad.exe paths
set XML_NOTEPAD_PATH=%LOCALAPPDATA%\Apps\2.0
set EXE_PATHS=

echo Looking in %XML_NOTEPAD_PATH% for XmlNotepad.exe

for /r "%XML_NOTEPAD_PATH%" %%i in (XmlNotepad.exe) do (
    echo Found XmlNotepad.exe at %%i
    set "EXE_PATHS=!EXE_PATHS!%%i;"
)

rem Choose the first valid XmlNotepad.exe path
for %%p in (%EXE_PATHS%) do (
    if exist "%%~p" (
        set "CHOSEN_PATH=%%~p"
        goto :Launch
    )
)

:Launch
if defined CHOSEN_PATH (
    echo Starting XmlNotepad.exe at !CHOSEN_PATH!
    start "" "!CHOSEN_PATH!" "%~1"
) else (
    echo XmlNotepad.exe not found at any valid path.
)

echo.
pause

endlocal