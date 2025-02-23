# ioTools - XRCatTool Scripts

This directory contains automation scripts for unpacking game files using XRCatTool.

## How to Use

1. **Setup:**
   - Extract the scripts to the main folder of your X4: Foundations game installation.

2. **Setting up XRCatTool:**
   - Run `_xrcattool__setpath.bat` with administrator privileges.
   - This step configures the X Tools main executable location to the `XRCATTOOL_PATH` system environment variable.

3. **Running the Scripts:**
   - Once the setup is completed successfully, run the desired script from this directory.
   - `__xrcattool_unpack_custom` simplifies process of unpacking.

### Notes:

- By default, the setup is straightforward. The initial script assumes that both the game and X Tools are installed on the same drive via Steam.
- The script will prompt for the X Tools path. You can leave it empty to use the default location (`../X Tools` relative to the X4: Foundations installation folder).
- To make us of `_xrcattool_unpack_custom` the user needs to install [Python](https://www.python.org/downloads/) first.

### News

#### 2025-02

> **Warning:**
> Make sure that Python is installed on your machine. New features utilizes Python.

- **Notable Change**: Renamed `xrcattool__setpath` to `_xrcattool__setpath`.

##### New Ultimate Unpacking Script

- **Enhanced Unpacking Script**: The script `_xrcattool_unpack_custom.bat` supports unpacking .cat files with greater flexibility and user control.
- **Automatic File Discovery**: If no input files are specified, the script will automatically search for and unpack ALL .cat files in the current directory and its subdirectories, preserving the folder structure.
- **Relative Paths**: Users can now provide relative paths to .cat files (e.g., extensions\mod1\01.cat or ..\extensions\02.cat) with input or by using the **file_list.txt**. User is able to specify relative paths to .cat files within **file_list.txt**. One file per line, but do not use quotes.
- **Advanced Usage**: Users can unpack entire mod folders or the entire extensions directory at once by leaving the input blank.
- **Preserved Directory Structure**: Unpacked files are saved in the _unpacked folder, maintaining the original directory structure for better organization and usability.
- **User-Friendly Guide**: The script includes a detailed guide on usage, troubleshooting, and advanced features, making it easier for users to understand and adapt the script to their needs.
