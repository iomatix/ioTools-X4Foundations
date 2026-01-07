@echo off
setlocal

set STEAM="C:\Program Files (x86)\Steam\steam.exe"
set APPID=392160

set DATE=%date:~10,4%-%date:~4,2%-%date:~7,2%
set TIME=%time:~0,2%-%time:~3,2%

start "" %STEAM% -applaunch %APPID% ^
-debug all ^
-logfile "x4-game-%DATE%_%TIME%.log" ^
-scriptlogfile "x4-script-%DATE%_%TIME%.log"
