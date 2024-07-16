# FontTools

This directory contains tools and scripts for converting installed fonts into X4-recognized formats such as `.dds` and `.abc`. The original author of the scripts is [Dmitry 'hhrhhr' Zaitsev](https://github.com/hhrhhr/Lua-utils-for-X-Rebirth/commits?author=hhrhhr). Every necessary script for this tool has been completely rewritten in both `LUA` and `.cmd` files to be compliant with X4:Foundations.

## Dependencies

FontTools relies on several third-party software packages, each with its own license:

- [X Tools](https://www.egosoft.com/download/x4/bonus_en.php) - *Licensed under the Egosoft License*
- [Nvidia Texture Tools](https://developer.nvidia.com/texture-tools-exporter) - *Licensed under the Nvidia License*
- [ImageMagick](https://imagemagick.org/script/develop.php) - [*Licensed under the ImageMagick License*](https://imagemagick.org/script/license.php)
- [BMFont](https://www.angelcode.com/products/bmfont/) - [*Licensed under the zlib License*](https://www.zlib.net/zlib_license.html)
- [LuaJIT](https://luajit.org/), [Lua53, Lua](https://www.lua.org/download.html) - [*Licensed under GPL*](https://www.lua.org/license.html)
- [GZip](https://www.gnu.org/software/gzip/) - [*Licensed under GPL-3.0*](https://www.gnu.org/licenses/gpl-3.0.html)
- [md5deep](https://md5deep.sourceforge.net/) - [*Licensed under GPL*](https://github.com/jessek/hashdeep/blob/master/COPYING)

**Note:** These dependencies are not distributed under the FontTools license. Each uses its respective third-party license available on their official websites.

## Latin Characters Support

Configuration files are set up to support the conversion of Latin fonts with special characters for X4: Foundations.

## How to Use

1. **Setting up FontTools:**
   - Extract FontTools to the desired location.
   - Install the fonts you want to convert (e.g., `.ttf` files from [Google Fonts](https://fonts.google.com/)).
   - Open the `config_fonts.lua` file in this directory and edit its settings as desired.

      ```
      -- Configuration config_fonts.lua Example.

        Fonts = {
            playwriteCuba = { -- Unique identifier for the font configuration. Must be unique.
                fontname = "Playwrite Cuba", -- The OS case-sensitive name of the font (e.g., "Times New Roman", "Verdana"). Ensure the font is installed on the computer running the scripts.
                {
                    suffix = "", -- Suffix for the regular font
                    bold = 0, -- Bold setting (0 for false)
                    italic = 0, -- Italic setting (0 for false)
                    outline = 0, -- Outline setting (0 for false)
                    scale = 4, -- Parameter for scaling the font (use values like 4, 8, 16, etc. Higher values require higher width x height resolution but result in better quality. Optimal values are around `scale=16` with `27648x10240` resolution).
                    size = { 6, 7, 8, 9, 11, 14, 16, 18, 21, 24, 26 }, -- Native font sizes. (For best quality, keep it equal to new_size)
                    new_size = { 7, 8, 9, 10, 12, 16, 18, 20, 24, 32, 36 }, -- Desired font sizes. (For X4, keep it around 32-55. 32 is native for X4; higher values result in a bigger UI but also clearer text. Values around 50-55 are recommended).
                    width = { 256, 256, 256, 256, 256, 256, 256, 512, 512, 512, 512 }, -- Texture map width (Keep it wider than the height value).
                    height = { 128, 128, 128, 128, 256, 256, 256, 256, 256, 512, 512 } -- Texture map height (Ensure enough space for all characters on one image page).
                },
                {
                    suffix = " Bold", -- Suffix for the bold font
                    bold = 1, -- Bold setting (1 for true)
                    italic = 0,
                    outline = 0,
                    scale = 4,
                    size = { 7, 8, 9, 11, 14, 18, 21, 22, 24, 26, 28, 30, 72 },
                    new_size = { 8, 9, 10, 12, 16, 20, 24, 28, 32, 36, 42, 48, 81 },
                    width = { 256, 256, 256, 256, 256, 512, 512, 512, 512, 512, 512, 512, 1024 },
                    height = { 128, 128, 128, 256, 256, 256, 256, 512, 512, 512, 512, 512, 1024 }
                },
                {
                    suffix = " Italic", -- Suffix for the italic font
                    bold = 0,
                    italic = 1, -- Italic setting (1 for true)
                    outline = 0,
                    size = { 7, 8, 9, 11, 14, 18, 21, 22, 24, 26, 28, 30, 72 },
                    new_size = { 8, 9, 10, 12, 16, 20, 24, 28, 32, 36, 42, 48, 81 },
                    scale = 4,
                    width = { 256, 256, 256, 256, 256, 512, 512, 512, 512, 512, 512, 512, 1024 },
                    height = { 128, 128, 128, 256, 256, 256, 256, 512, 512, 512, 512, 512, 1024 }
                },
                {
                    suffix = " outlined", -- Suffix for the outlined font
                    bold = 0,
                    italic = 0,
                    outline = 1, -- Outline setting (1 for true)
                    size = { 6, 7, 8, 9, 11, 14, 16, 18, 21, 24, 26 },
                    new_size = { 7, 8, 9, 10, 12, 16, 18, 20, 24, 32, 36 },
                    scale = 4,
                    width = { 256, 256, 256, 256, 256, 512, 512, 512, 512, 512, 1024 },
                    height = { 128, 256, 256, 256, 256, 256, 256, 512, 512, 512, 512 }
                }
            }
        }

2. **Running the Scripts:**
   - Once the setup is completed, run the scripts in the following order:
     - **Step 1:** Run `step1_make_bmfc_X4.cmd` to generate the configuration file for the `BMFont` software based on the settings in `config_fonts.lua`. This will also generate the necessary files: binary `.fnt` and graphical `.png` maps.
     - **Step 2:** Run `step2_make_abc_X4.cmd` to generate `.abc` files for each font. This step uses `ImageMagick` to transform the `.png` files, making them ready for conversion to `.dds` format in the next step.
     - **Step 3:** Run `step3_make_dds_X4.cmd` to use `Nvidia Export Tools` to convert the `.png` maps to `.dds` files.
     - **Optional Step 4:** Run `step4_pack_X4.cmd` to package everything.

### Notes
- If you are confident in what you are doing, you can run the `start.bat` script, which sequentially executes all other steps.
- Logging by default is enabled. Scripts will verbose the logs to the `logs.txt` file by default.
- The first step (`step1_make_bmfc_X4.cmd`) generates the necessary files, including the `.bmfc` config, and runs `BMFont` to create binary font `.fnt` and graphical texture `.png` maps based on the settings in `config_fonts.lua`.
- The second step (`step2_make_abc_X4.cmd`) generates `.abc` files that map how the game (X4 Foundations) will read the `.dds` texture. This step transforms `.png` files using `ImageMagick` to prepare them for conversion to `.dds` format.
- The third step (`step3_make_dds_X4.cmd`) uses `Nvidia Export Tools` to convert `.png` maps to `.dds` files.
- The fourth step (`step4_pack_X4.cmd`) is optional and packages everything.
- If any step fails, rerun the steps from the beginning. Higher resolutions may take longer based on your computer's performance and hardware capabilities. Using this tool is recommended only for developers familiar with programming languages and who have a development-ready PC.
- Default directories and files will be created automatically if they do not exist. By default, everything will generate within the `generated_fonts` directory.
- Advanced settings are available in the `include.cmd` file.
- All scripts, including LUA, handle and react to errors by providing output messages to help diagnose any problems.
