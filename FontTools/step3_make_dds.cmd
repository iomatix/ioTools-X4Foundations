@echo off
setlocal enabledelayedexpansion

rem tools path
call include.cmd
if errorlevel 1 (
    echo [ERROR] Failed to include tools path from include.cmd
    goto eof
)

rem clear old results
if exist fonts_new\*.dds del /q /f fonts_new\*.dds >nul
if exist fonts_new\*.gz del /q /f fonts_new\*.gz >nul

rem convert all tga to dds
for %%i in (fonts_new\*.bmfc) do (
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
for %%i in (fonts_new\*.dds) do (
    set q=%%~nxi
    set q=!q:_0.dds=!
    copy /y "fonts_new\%%~nxi" "fonts_new\!q!" >nul
    if errorlevel 1 (
        echo [ERROR] Failed to copy fonts_new\%%~nxi to fonts_new\!q!
        goto eof
    )
    %GZIPEXE% -9 -f -n "fonts_new\!q!"
    if errorlevel 1 (
        echo [ERROR] Failed to gzip fonts_new\!q!
        goto eof
    )
)
echo.
echo [LOG OK] all textures are gzipped.
echo.

rem copy fonts to mod dir
copy /y fonts_new\*.abc mod\assets\fx\gui\fonts\textures >nul
if errorlevel 1 (
    echo [ERROR] Failed to copy .abc files to mod\assets\fx\gui\fonts\textures
    goto eof
)
copy /y fonts_new\*.gz mod\assets\fx\gui\fonts\textures >nul
if errorlevel 1 (
    echo [ERROR] Failed to copy .gz files to mod\assets\fx\gui\fonts\textures
    goto eof
)
echo.
echo [LOG OK] all files are copied.
echo.

:eof
pause
