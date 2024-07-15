@echo off
echo [LOG] Running ImageMagick: %IMGMAGICK%
echo.

for %%i in (generated_fonts\*.png) do (
    echo [LOG] Processing "%%~dpni.png" with ImageMagick...
    echo.
    :: TODO: Fixing issues with ImageMagick...
    %IMGMAGICK% convert "%%i" ^
    ( +clone -negate -morphology Distance Euclidean:4 -level 50%,-50% ) ^
    -morphology Distance Euclidean:4 ^
    -compose Plus -composite ^
    -level 47%,53% -negate -filter Jinc -resize 25% "%%i"
    if errorlevel 1 (
            echo [ERROR] Failed to process "%%~dpni.png" with ImageMagick!
            exit /b 1
        )
    echo [SUCCESS] "%%~dpni.png" has been processed successfully by ImageMagick!
    echo.
)

:eof
exit /b 0