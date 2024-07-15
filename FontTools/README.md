
# FontTools

This directory contains tools and scripts for converting installed fonts to a X4 recognized formats as `.dds` and `.abc`.
Original author of the scripts is [Dmitry 'hhrhhr' Zaitsev](https://github.com/hhrhhr/Lua-utils-for-X-Rebirth/commits?author=hhrhhr).

### FontTools use and depends on some third party software with their own licensnes:

- [Nvidia Texture Tools](https://developer.nvidia.com/texture-tools-exporter *Licensed under the Nvidia License*
- [ImageMagick](https://imagemagick.org/script/develop.php)
 [*Licensed under the ImageMagick License*](https://imagemagick.org/script/license.php)
- [BMFont](https://www.angelcode.com/products/bmfont/)[*Licensed under the zlib License*](https://www.zlib.net/zlib_license.html)
- Lua Tools ([LuaJIT](https://luajit.org/), [Lua53, Lua](https://www.lua.org/download.html))[*Licensed under GPL*](https://www.lua.org/license.html)
- [GZip](https://www.gnu.org/software/gzip/) [*Licensed under GPL-3.0*](https://www.gnu.org/licenses/gpl-3.0.html)
- [md5deep](https://md5deep.sourceforge.net/) [*Licensed under GPL*](https://github.com/jessek/hashdeep/blob/master/COPYING)

***These are not distributed under license of the FontTools but instead of each of them is using its third party license file accessible on their official websites.***

## Latin Characters Support

**Configuration files has been edited to support conversion of Latin fonts with support for the  special characters.**




## How to Use

1. **Setup:**
   - Extract the FontTools to the desired location.
   - Install desired fonts you want to convert with e.g. .ttf files provided by [Google Fonts](https://fonts.google.com/).

2. **Setting up FontTools:**
   - Open  the `config_fonts.lua` file located in this directory and edit its settings as you desire.** *Mind that currently for X4 you only need to generate all on one map for single font size, by default it is 32px so following example is completely an overkill.*
   ```lua
    -- Configuration file settings example for Latin fonts support.
    Fonts = {
    playwriteCuba = { -- unique id
        fontname = "Playwrite Cuba", -- The desired font name
        {
            suffix = "", -- Regular font
            bold = 0,
            italic = 0,
            outline = 0,
            size =     { 6, 7, 8, 9, 11, 14, 16, 18, 21, 24, 26 }, -- native font sizes
            new_size = { 7, 8, 9, 10, 12, 16, 18, 20, 24, 32, 36 }, -- desired font size, for X4 keep it around 32-55 
            scale = 4, -- parameter for scaling the font later on with better method (use 4, 8 or 16).
            width =    { 256, 256, 256, 256, 256, 256, 256, 512, 512, 512, 512 }, -- texture map width
            height =   { 128, 128, 128, 128, 256, 256, 256, 256, 256, 512, 512 } -- texture map height
        },
        {
            suffix = " Bold", -- Bold font
            bold = 1, -- Bold font
            italic = 0,
            outline = 0,
            size =     { 7, 8, 9, 11, 14, 18, 21, 22, 24, 26, 28, 30, 72 },
            new_size = { 8, 9, 10, 12, 16, 20, 24, 28, 32, 36, 42, 48, 81 },
            scale = 4,
            width =    { 256, 256, 256, 256, 256, 512, 512, 512, 512, 512, 512, 512, 1024 },
            height =   { 128, 128, 128, 256, 256, 256, 256, 512, 512, 512, 512, 512, 1024 }
        },
        {
            suffix = " Italic", -- Italic font
            bold = 0, -- Italic font
            italic = 1,
            outline = 0,
            size =     { 7, 8, 9, 11, 14, 18, 21, 22, 24, 26, 28, 30, 72 },
            new_size = { 8, 9, 10, 12, 16, 20, 24, 28, 32, 36, 42, 48, 81 },
            scale = 4,
            width =    { 256, 256, 256, 256, 256, 512, 512, 512, 512, 512, 512, 512, 1024 },
            height =   { 128, 128, 128, 256, 256, 256, 256, 512, 512, 512, 512, 512, 1024 }
        },
        {
            suffix = " outlined", -- Outlined font
            bold = 0,
            italic = 0,
            outline = 1, -- Outlined font
            size =     { 6, 7, 8, 9, 11, 14, 16, 18, 21, 24, 26 },
            new_size = { 7, 8, 9, 10, 12, 16, 18, 20, 24, 32, 36 },
            scale = 4,
            width =    { 256, 256, 256, 256, 256, 512, 512, 512, 512, 512, 1024 },
            height =   { 128, 256, 256, 256, 256, 256, 256, 512, 512, 512, 512 }
        }
    }
   }
   ```
   
3. **Running the Scripts:**
   - Once the setup is completed successfully, run scripts in following order.
   - Run include.cmd to setup necessary variables.
   - Run step1_make_bmfc.cmd to generate `.png`, `.bmfc`, `.fnt` files.
   - Check manually generated `.bmfc` config files by running `bmfont64.exe` and loading these via `Options > Load Configuration` then visualize output by pressing `V` button on the keyboard. The output should not exceed the width or height and all of it should be on only one page, so not two or more atlas pages, only one singular map. 



   - Check if only `.bmfc`, `.fnt`, `*_0.tga` files exists within a `generated_fonts\` directory. If `*_1.tga` or with any higher value exists, that means that only characters from the first page (`*_0.tga`) will be converted so the output files, the `.dds`, and the `.abc` will be corrupted.
   - Run step2_make_abc.cmd to generate `.abc` files that X4 will understand our font maps.
   - Run step3_make_dds.cmd to generate texture maps in `.dds` files.
   - Within `generated_fonts\` directory find desired `.dds` and `.abc` files. Default size is 32 pixels.
   - To replace default X4 font, please rename desired files to `Zekton_32.dds`, `Zekton_32.abc` and `Zekton Bold_32.dds`, `Zekton Bold_32.abc`. Create a new directories structure `assets\fx\gui\fonts` and place the `.abc` and `.dds` files there.


### Notes:

   - step4_pack.cmd is not used to replace the default X4 font but instead it packs the files to a catalog and adds them to paths in X:Rebirth format. I suppose that it won't work with X4 currently.