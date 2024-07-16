@echo off
echo [LOG] Running ImageMagick: %IMGMAGICK%
echo.

:: Process the image with ImageMagick and resize it to 25% (for scale:4)
for %%i in (generated_fonts\*.png) do (
    echo [LOG] Processing "%%~dpni.png" with ImageMagick...
    echo.

    :: TODO: Fixing issues with ImageMagick...
    magick.cmd %IMGMAGICK% "%%i" "%%i"
    if errorlevel 1 (
        echo [ERROR] Failed to process "%%~dpni.png" with ImageMagick!
        exit /b 1
    )
    echo [SUCCESS] "%%~dpni.png" has been processed successfully by ImageMagick!
    echo.
)

:eof
exit /b 0