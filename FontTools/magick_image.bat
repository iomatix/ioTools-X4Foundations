@echo off

for %%i in (generated_fonts\*.png) do (
    echo Processing "%%i"...
    %IMGMAGICK% convert "%%i"^
    ( +clone -negate -morphology Distance Euclidean:4 -level 50%,-50% )^
    -morphology Distance Euclidean:4 -compose Plus -composite^
    -level 47%,53% -negate -filter Jinc -resize 25% "%%i"
    if errorlevel 1 (
            echo [ERROR] Failed to process "%%i" with ImageMagick!
            exit /b 1
        )
    echo.
)

exit /b 0