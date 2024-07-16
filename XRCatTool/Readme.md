# ioTools - XRCatTool Scripts

This directory contains automation scripts for unpacking game files using XRCatTool.

## How to Use

1. **Setup:**
   - Extract the scripts to the main folder of your X4: Foundations game installation.

2. **Setting up XRCatTool:**
   - Run `xrcattool__setpath.bat` with administrator privileges.
   - This step configures the X Tools main executable location to the `XRCATTOOL_PATH` system environment variable.
   
3. **Running the Scripts:**
   - Once the setup is completed successfully, run the desired script from this directory.

### Notes:
- By default, the setup is straightforward. The initial script assumes that both the game and X Tools are installed on the same drive via Steam.
- The script will prompt for the X Tools path. You can leave it empty to use the default location (`../X Tools` relative to the X4: Foundations installation folder).


### TODO: Creating a script to pack everything to a single pack with name defined by user (by default it should be ext_01) from the mods/* (or choosen by the user) catalog. Support for adding single files should be provided. 