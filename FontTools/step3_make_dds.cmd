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
if exist generated_fonts\*.dds del /q /f generated_fonts\*.dds >nul
if exist generated_fonts\*.gz del /q /f generated_fonts\*.gz >nul

rem convert all tga to dds
for %%i in (generated_fonts\*.bmfc) do (
    %TGA2DDS% "%%~dpni_0.tga"
    if errorlevel 1 (
        echo [ERROR] Failed to convert %%~dpni_0.tga to .dds
        goto eof
    )
)
echo.
echo [LOG OK] .dds are ready.
echo.

rem pack dds
for %%i in (generated_fonts\*.dds) do (
    set q=%%~nxi
    set q=!q:_0.dds=!
    copy /y "generated_fonts\%%~nxi" "generated_fonts\!q!" >nul
    if errorlevel 1 (
        echo [ERROR] Failed to copy generated_fonts\%%~nxi to generated_fonts\!q!
        goto eof
    )
    %GZIPEXE% -9 -f -n "generated_fonts\!q!"
    if errorlevel 1 (
        echo [ERROR] Failed to gzip generated_fonts\!q!
        goto eof
    )
)
echo.
echo [LOG OK] all textures are gzipped.
echo.

rem copy fonts to mod dir
copy /y generated_fonts\*.abc mod\assets\fx\gui\fonts\textures >nul
if errorlevel 1 (
    echo [ERROR] Failed to copy .abc files to mod\assets\fx\gui\fonts\textures
    goto eof
)
copy /y generated_fonts\*.gz mod\assets\fx\gui\fonts\textures >nul
if errorlevel 1 (
    echo [ERROR] Failed to copy .gz files to mod\assets\fx\gui\fonts\textures
    goto eof
)
echo.
echo [LOG OK] all files are copied.
echo.

:eof
pause
