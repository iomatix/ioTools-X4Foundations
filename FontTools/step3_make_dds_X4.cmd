@echo off
setlocal

echo.
echo "|   __   ______ _ ___ _____   ____   __   _  __  __ __  __ _____ ___   __ |"
echo "| /' _/ / _/ _ \ | _,\_   _| |  \ `v' /  | |/__\|  V  |/  \_   _| \ \_/ / |"
echo "| `._`.| \_| v / | v_/ | |   | -<`. .'   | | \/ | \_/ | /\ || | | |> , <  |"
echo "| |___/ \__/_|_\_|_|   |_|   |__/ !_!    |_|\__/|_| |_|_||_||_| |_/_/ \_\ |"
echo "|  _________________________________________________________________________ |"
echo "| )___)___)___)___)___)___)___)___)___)___)___)___)___)___)___)____)___/___/ |"
echo "| /___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(___(  |"
echo.

:: Set tools path
call include.cmd
if errorlevel 1 (
    echo [ERROR] Failed to include tools path from include.cmd
    goto eof
)

:: Clear old results
echo.
echo [LOG] Clearing old texture maps...
if exist %FOLDER%\*.dds del /q /f %FOLDER%\*.dds >nul
if exist %FOLDER%\*.gz del /q /f %FOLDER%\*.gz >nul

:: Convert all .png files to the .dds texture format
echo.
echo [LOG] Processing all pictures to .dds textures...
for %%i in (%FOLDER%\*.bmfc) do (
    echo [LOG] Processing "%%~dpni_0.png" to "%%~ni.dds"...
    %PNG2DDS% "%%~dpni_0.png" -o "%%~dpni.dds"
    echo.
    if errorlevel 1 (
        echo [ERROR] Failed to convert %%~dpni_0.png to .dds
        echo [ERROR] Does the file exist?
        goto eof
    )
)
echo.
echo [LOG OK] .dds are ready.
echo.

:: Moving files to mod dir...
echo.
echo [LOG] Copying *.abc and *.dds to %TARGET%...
echo.
copy /y %FOLDER%\*.abc %FOLDER%\mods\%TARGET% >nul
if errorlevel 1 (
    echo [ERROR] Failed to copy .abc files to the %TARGET directory
    goto eof
)
copy /y %FOLDER%\*.dds %FOLDER%\mods\%TARGET% >nul
if errorlevel 1 (
    echo [ERROR] Failed to copy .dds files to the %TARGET% direcotry
    goto eof
)
echo.
echo [LOG OK] all files are copied.
echo.

echo.
echo [SUCCESS] Step 3 has been completed successfully!

:eof
endlocal