@echo off
setlocal enabledelayedexpansion

rem tools path
call include.cmd

if .==.%1 goto fail
set XMFPATH=%1

set /a num_all=0

if not exist models mkdir models

:convert
set /a N=0 & set /a num=0
for /f "usebackq delims=" %%i in (`dir %XMFPATH%\*.xmf /s /b`) do (
    set /a num+=1
)
for /f "usebackq delims=" %%i in (`dir %XMFPATH%\*.xmf /s /b`) do (
    set /a N+=1
    title unpacking file !N! / %num% > nul
    echo unpacking file !N! / %num% ^(%%~nxi^) ...
    %LUAJIT% lua\xmf2obj.lua "%%i" models "%%~ni"
)
echo converting %num% files done.
echo.
set /a num_all+=num

goto eof

:fail
echo.
echo usage: unpack_xmf.cmd path_to_catalog_with_xmf
echo.

:eof
pause
