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
call :log [INFO] Calling step3_make_dds_X4.cmd...

:: Clear old results
echo.
call :log [LOG] Clearing old texture maps...
if exist %FOLDER%\*.dds del /q /f %FOLDER%\*.dds >nul
if exist %FOLDER%\*.gz del /q /f %FOLDER%\*.gz >nul

:: Convert all .png files to the .dds texture format
echo.
call :log [LOG] Processing all pictures to .dds textures...
for %%i in (%FOLDER%\*.bmfc) do (
    call :log [LOG] Processing "%%~dpni_0.png" to "%%~ni.dds"...
    %PNG2DDS% "%%~dpni_0.png" -o "%%~dpni.dds"
    echo.
    if errorlevel 1 (
        call :log [ERROR] Failed to convert %%~dpni_0.png to .dds
        call :log [ERROR] Does the file exist?
        goto eof
    )
)
echo.
call :log [LOG OK] .dds are ready.
echo.

:: Moving files to mod dir...
echo.
call :log [LOG] Copying *.abc and *.dds to %TARGET%...
echo.
copy /y %FOLDER%\*.abc %FOLDER%\mods\%TARGET% >nul
if errorlevel 1 (
    call :log [ERROR] Failed to copy .abc files to the %TARGET directory
    goto eof
)
copy /y %FOLDER%\*.dds %FOLDER%\mods\%TARGET% >nul
if errorlevel 1 (
    call :log [ERROR] Failed to copy .dds files to the %TARGET% direcotry
    goto eof
)
echo.
call :log [LOG OK] all files are copied.
echo.

echo.
call :log [SUCCESS] Step 3 has been completed successfully!

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