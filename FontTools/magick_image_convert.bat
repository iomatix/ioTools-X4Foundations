@echo off
echo [LOG] Running ImageMagick: %IMGMAGICK%
echo.

for %%i in (generated_fonts\*.png) do (
    echo [LOG] Processing "%%~dpni.png" with ImageMagick...
    echo.
    
   
    if errorlevel 1 (
            echo [ERROR] Failed to process "%%~dpni.png" with ImageMagick!
            exit /b 1
        )
    echo [SUCCESS] "%%~dpni.png" has been processed successfully by ImageMagick!
    echo.
)

:eof
exit /b 0