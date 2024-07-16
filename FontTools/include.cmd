@echo off

set D=%~dp0
echo [LOG] Working directory set to "%D%"
echo.

set FOLDER="generated_fonts"
echo [LOG] Output directory set to %FOLDER%
set TARGET="assets\fx\gui\fonts\textures"
echo [LOG] Mod target path set to %TARGET%
set REPLACEFONT="Zekton"
echo [LOG] Font to replace set to %REPLACEFONT%

echo.
set CATDAT=ext_01
echo [LOG] CATDAT set to %CATDAT%
set CATDATSUBST=subst_01
echo [LOG] CATDATSUBST set to %CATDATSUBST%
set OUTDIR="out"
echo [LOG] OUTDIR set to %OUTDIR%

echo.
set XRCATTOOL="%D%tools\XRCatTool.exe"
echo [LOG] X Tools set to %XRCATTOOL%

echo.
set LUA="%D%tools\lua54.exe"
echo [LOG] Lua set to %LUA%
set LUAJIT="%D%tools\luajit.exe"
echo [LOG] LuaJIT set to %LuaJIT%

echo.
set BMFONT="%D%tools\bmfont64.exe"
echo [LOG] BMFONT set to %BMFONT%
set IMGMAGICK="%D%tools\magick.exe"
echo [LOG] IMGMAGICK set to %IMGMAGICK%

echo.
set NVTT="%D%tools\nvtt_export.exe"
echo [LOG] NVTT set to %NVTT% 
:: X:Rebirth
set TGA2DDS=%NVTT% --format 18
:: X4:Foundations TODO: --format ??? 0 
:: --format: 0 -> a8, 18 -> bc3, 20 -> bc4, 21 -> bc5, 23 -> bc7
::  When converting to DDS, the DXGI format to convert to (default: bc7). For most RGBA images, try using BC7. For three-channel HDR images, try using BC6U if all values are positive or BC6S otherwise. BC4 and BC5 are good for one-channel (red) and two-channel (red, green) images, respectively. ASTC images will be stored uncompressed on many desktop GPUs, but are good for non-HDR RGBA images on Tegra GPUs.
set PNG2DDS=%NVTT% --format 23 --no-mips

echo.
set GZIPEXE="%D%tools\gzip.exe"
echo [LOG] GZIPEXE set to %GZIPEXE%
set MD5DEEP="%D%tools\md5deep"
echo [LOG] MD5DEEP set to %MD5DEEP%

echo.
set VERBOSE="Y"
set LOGFILE="%D%logs.txt"
echo [LOG] Logs file set to %LOGFILE%






