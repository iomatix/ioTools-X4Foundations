@echo off
setlocal

:: Set tools path
call include.cmd
if errorlevel 1 (
    call :log [ERROR] Failed to include tools path from include.cmd
    goto eof
)

echo.
call :log "|   __   ______ _ ___ _____   ____   __   _  __  __ __  __ _____ ___   __ |"
call :log "| /' _/ / _/ _ \ | _,\_   _| |  \ `v' /  | |/__\|  V  |/  \_   _| \ \_/ / |"
call :log "| `._`.| \_| v / | v_/ | |   | -<`. .'   | | \/ | \_/ | /\ || | | |> , <  |"
call :log "| |___/ \__/_|_\_|_|   |_|   |__/ !_!    |_|\__/|_| |_|_||_||_| |_/_/ \_\ |"
call :log "|  _________________________________________________________________________ |"
call :log "| )___)___)___)___)___)___)___)___)___)___)___)___)___)___)___)____)___/___/ |"
call :log "| /___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(  |"
echo.

:: Verbose
echo.
call :log [INFO] Calling step1_make_bmfc_X4.cmd...

:: Prepare dirs
echo.
call :log [LOG] Preparing directories...
if not exist %FOLDER% mkdir %FOLDER%
if errorlevel 1 (
    call :log [ERROR] Failed to create directory: %FOLDER%
    goto eof
)
if not exist %FOLDER%\mods\%TARGET% mkdir %FOLDER%\mods\%TARGET%
if errorlevel 1 (
    call :log [ERROR] Failed to create directory: %TARGET% within the mods directory.
    goto eof
)
echo.
call :log [LOG OK] Working directories exist.


:: Clean old results
echo.
call :log [LOG] Clearing directories...
for /r %FOLDER% %%R in (*.bmfc *.fnt *.tga *.png *.abc *.dds *.cat *.dat) do (
    if exist "%%R" (
        call :log [LOG] Removing %%R...
        del /q /f "%%R" >nul
        call :log [LOG OK] %%R is removed.
    )
    if errorlevel 1 (
        call :log [ERROR] Failed to prepare directory: %FOLDER%.
        goto eof
    )
)
echo.
call :log [LOG OK] Old results are cleared from %FOLDER%.

:: Generate config for BMFont
echo.
call :log [LOG] Generating BMFont config files...
%LUA% lua\generate_bmfc_x4.lua
if errorlevel 1 (
    call :log [ERROR] Failed to generate .bmfc files using generate_bmfc_x4.lua
    goto eof
)
echo.
call :log [LOG OK] .bmfc files are generated.

:: Run BMFont
echo.
call :log [LOG] Processing .bmfc files using BMFont...
call :log [INFO] Please be patient, it will take a few minutes to process all files.
for %%i in (%FOLDER%\*.bmfc) do (
    call :log [LOG] Processing "%%~dpni"
    %BMFONT% -c "%%i" -o "%%~dpni"
    if errorlevel 1 (
        call :log [ERROR] Failed to process "%%i" with BMFont
        goto eof
    )
    echo.
)
echo.
call :log [LOG OK] .fnt and .png files are created.
call :log [WARNING] If any *_01.png exists, then tune up config_fonts.lua and rerun this script.
call :log [WARNING] There should be only one page of texture per each font file.
call :log [WARNING] If any other problems occure, please check .bmfc manually using BMFont software.
echo.

echo.
call :log [SUCCESS] Step 1 has been completed successfully!
call :log [WARNING] Please, check the WARNING messages.

:: Terminate the script cleanly
:eof
endlocal
exit /b 0

:: Function to log with date and time
:log
setlocal
if %VERBOSE%=="Y" (
echo [%DATE% %TIME%] %* >> %LOGFILE%
)
goto :eof
