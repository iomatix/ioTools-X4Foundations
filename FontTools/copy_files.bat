:: Copy the file to the destination folder with the new name
echo.
echo [Log] Copying %1 as %2...
copy %1 %2
if errorlevel 1 (
    echo [ERROR] Failed to copy %1.
    echo Exiting...
    exit 1 \b
) 
echo [LOG OK] Copied %1 to %2