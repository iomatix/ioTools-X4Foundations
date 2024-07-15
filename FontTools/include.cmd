@echo off

set D=%~dp0%

set LUA="%D%tools\lua54.exe"
echo [LOG] Lua set to %LUA%
set LUAJIT="%D%tools\luajit.exe"
echo [LOG] LuaJIT set to %LuaJIT%
set BMFONT="%D%tools\bmfont64.exe"
echo [LOG] BMFONT set to %BMFONT%
set TGA2DDS="%D%tools\nvtt_export.exe" -bc3
echo [LOG] TGA2DDS set to %TGA2DDS%
set GZIPEXE="%D%tools\gzip.exe"
echo [LOG] GZIPEXE set to %GZIPEXE%
set IMGMAGICK="%D%tools\magick.exe"
echo [LOG] IMGMAGICK set to %IMGMAGICK%

set MD5DEEP="%D%tools\md5deep"
echo [LOG] MD5DEEP set to %MD5DEEP%

set CATDAT=08
set OUTDIR="."

echo [LOG] CATDAT set to %OUTDIR%%CATDAT%

