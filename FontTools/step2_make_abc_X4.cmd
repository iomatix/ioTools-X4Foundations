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
call :log [INFO] Calling step2_make_abc_X4.cmd...

:: Clear old results
echo.
call :log [LOG] Clearing old .abc files...
if exist %FOLDER%\*.abc del /q /f %FOLDER%\*.abc 


:: Convert font descriptors
echo.
call :log [LOG] Converting font descriptors...
echo.
%LUA% lua\generate_abc_x4.lua
if errorlevel 1 (
        call :log [ERROR] Failed to convert descriptors.
        goto eof
    )

echo.
call :log [LOG OK] font descriptors are ready.
call :log [LOG OK] .abc files are created.
echo.

:: Run ImageMagick to generate signed distance fields and scale it
echo.
call :log [LOG] Calling ImageMagick script to generate signed distance fields and scale it...
call :log [INFO] Please be patient, it will take a few minutes to process all files.
call magick_image_convert.bat
if errorlevel 1 (
        call :log [ERROR] Failed to generate signed distance fields.
        call :log [WARNING] The font won't work in X4 without signed distance fields. 
        call :log [WARNING] This step is mandatory and can not be skipped.
        goto eof
    )

echo.
call :log [LOG OK] .png files has been processed.
call :log [WARNING] If any *_01.png exists, then tune up config_fonts.lua and rerun scripts begining at step1 script.
call :log [WARNING] There should be only one page of texture per each font file.
call :log [WARNING] If any other problems occure, please check .bmfc manually using BMFont software.
echo.

echo.
call :log [SUCCESS] Step 2 has been completed successfully!
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