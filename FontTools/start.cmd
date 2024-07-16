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

:: Call
echo.
echo [LOG] Calling script step1_make_bmfc_X4.cmd
call step1_make_bmfc_X4.cmd
if errorlevel 1 (
    echo [ERROR] Processing the script step1_make_bmfc_X4.cmd failed with errorlevel 1.
    goto eof
)

echo.
echo [LOG] Calling script step2_make_abc_X4.cmd
call step2_make_abc_X4.cmd
if errorlevel 1 (
    echo [ERROR] Processing the script step2_make_abc_X4.cmd failed with errorlevel 1.
    goto eof
)

echo.
echo [LOG] Calling script step3_make_dds_X4.cmd
call step3_make_dds_X4.cmd
if errorlevel 1 (
    echo [ERROR] Processing the script step3_make_dds_X4.cmd failed with errorlevel 1.
    goto eof
)

echo.
echo [LOG] Calling script step4_pack_X4.cmd
call step4_pack_X4.cmd
if errorlevel 1 (
    echo [ERROR] Processing the script step4_pack_X4.cmd failed with errorlevel 1.
    goto eof
)

echo.
echo [LOG OK] .fnt and .png files are created.
echo [WARNING] If any *_01.png exists, then tune up config_fonts.lua and rerun this script.
echo [WARNING] There should be only one page of texture per each font file.
echo [WARNING] If any other problems occure, please check .bmfc manually using BMFont software.
echo.

echo.
echo [SUCCESS] Everything should be ready!
echo [WARNING] Please, check the WARNING messages.

:eof
endlocal
