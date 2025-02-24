# ioTools - Modding Kit

Welcome to ioTools - Modding Kit, a repository designed to enhance the modding experience for X4 Foundations with various tools, scripts, mods, and more. Feel free to use these resources in your own projects!

## [Release is available on Nexus](https://www.nexusmods.com/x4foundations/mods/1420?tab=description)
## [Github Releases](https://github.com/iomatix/ioTools-X4Foundations/releases)

## Tools Overview:

### FontTools - Generating font files for X4 Foundations never been easier

FontTools is package of tools designed to automate generating dictionaries files for X4 Foundations with its texture maps, the `.dds` files.
Everything is automated right now, and only requirements are to have the desired font installed on the PC running the scripts, configuring the `config_fonts.lua` file and running `start.bat` - if you know what are you doing. If not, just stick to the tool manual - only one additional manual action is necessary to be sure that the scripts will work.

### XRCatTool - Unpacker for X4 Foundations

XRCatTool is a tool specifically designed to unpack catalogs from X4 Foundations. It simplifies the process of extracting game data for modding purposes.

- **xrcattool__setpath.bat:**
  This script sets up the `XRCATTOOL_PATH` system environment variable, essential for locating the X Tools executable required by XRCatTool. Run this script before using any other XRCatTool scripts.

- **xrcattool_unpack_01_09.bat:**
  Unpacks catalogs 01 - 09 from the base game of X4 Foundations, consolidating all extracted data into a single folder.

- **xrcattool_unpack_xyz_dlc:**
  Unpacks catalogs from DLCs of X4 Foundations (e.g., Boron, Pirate, Split, Terran, Timelines). This script also consolidates all extracted data into a single folder.

- **New** Ultimate Unpacking Script - the script _xrcattool_unpack_custom.bat supports unpacking .cat files with greater flexibility and user control. It provides features like Automatic File Discovery, Automatic File Discovery, Preserved Directory Structure, Relative Paths, Advanced Usage, and a User-Friendly Guide on how to use it.

### WebTool - Simple WebApp for Modding Essentials

The WebTool is a straightforward WebApp providing essential tools for modding X4 Foundations.

- **Functionality:**
  - Requires Python 3 for operation. It supports exploring MD documentation via `scriptproperties.html`.
  - Supports exploring XML files and opens them in browser or external tools.
  - Provides hosting of raw libraries available to import within your scripts.
  - Includes basic support for `jobeditor.html`.
  - Custom `styles.css` enhances usability with a modern look.

- **Future Development:**
  More features will be added based on user and community feedback to further enhance modding capabilities.

## Getting Started

Ensure you have Python 3 installed for the WebTool and follow the setup instructions for XRCatTool to start using these tools effectively.

## Contributions

Contributions and feedback are welcome to improve and expand the capabilities of ioTools - Kit. Feel free to fork the repository and submit pull requests with enhancements or fixes.

Enjoy modding with ioTools - Kit!

### By downloading mods from Nexus you will support their authors.
