
# FontTools

This directory contains tools and scripts for converting installed fonts to a X4 recognized formats as `.dds` and `.abc`.
Original author of the scripts is [Dmitry 'hhrhhr' Zaitsev](https://github.com/hhrhhr/Lua-utils-for-X-Rebirth/commits?author=hhrhhr).

### FontTools use and depends on some third party software:

- [Nvidia Texture Tools](https://developer.nvidia.com/texture-tools-exporter)
- [ImageMagick](https://imagemagick.org/script/develop.php)
- [BMFont](https://www.angelcode.com/products/bmfont/)
- Lua Tools ([LuaJIT](https://luajit.org/), [Lua53, Lua](https://www.lua.org/download.html))
- [GZip](https://www.gnu.org/software/gzip/)
- [md5deep](https://md5deep.sourceforge.net/)
***These are not distributed under license of the FontTools but instead of each of them is using its third party license file accessible on their official websites.***

## Latin Characters Support

**Configuration files has been edited to support conversion of Latin fonts with support for the  special characters.**




## How to Use

1. **Setup:**
   - Extract the FontTools to the desired location.
   - Install desired fonts you want to convert with e.g. .ttf files provided by [Google Fonts](https://fonts.google.com/).

2. **Setting up FontTools:**
   - Open  the `config_fonts.lua` file located in this directory and edit its settings as follows:**
   ```lua
    -- Configuration file settings example for Latin fonts support.
    Fonts = {
    audiowide = {
        fontname = "Playwrite Cuba", -- The desired font name
        {
            suffix = "", -- Regular font
            bold = 0,
            outline = 0,
            size =     { 6, 7, 8, 9, 11, 14, 16, 18, 21, 24, 26 }, -- font sizes
            new_size = { 7, 8, 9, 10, 12, 16, 18, 20, 24, 32, 36 }, -- font sizes will be scaled to these sizes
            width =    { 256, 256, 256, 256, 256, 256, 256, 512, 512, 512, 512 }, -- texture map width
            height =   { 128, 128, 128, 128, 256, 256, 256, 256, 256, 512, 512 } -- texture map height
        },
        {
            suffix = " Bold", -- Bold font
            bold = 1, -- Regular font
            outline = 0,
            size =     { 7, 8, 9, 11, 14, 18, 21, 22, 24, 26, 28, 30, 72 },
            new_size = { 8, 9, 10, 12, 16, 20, 24, 28, 32, 36, 42, 48, 81 },
            width =    { 256, 256, 256, 256, 256, 512, 512, 512, 512, 512, 512, 512, 1024 },
            height =   { 128, 128, 128, 256, 256, 256, 256, 512, 512, 512, 512, 512, 1024 }
        },
        {
            suffix = " outlined", -- Outlined font
            bold = 0,
            outline = 1, -- Outlined font
            size =     { 6, 7, 8, 9, 11, 14, 16, 18, 21, 24, 26 },
            new_size = { 7, 8, 9, 10, 12, 16, 18, 20, 24, 32, 36 },
            width =    { 256, 256, 256, 256, 256, 512, 512, 512, 512, 512, 1024 },
            height =   { 128, 256, 256, 256, 256, 256, 256, 512, 512, 512, 512 }
        }
    }
   }
   ```
   
3. **Running the Scripts:**
   - Once the setup is completed successfully, run scripts in following order.
   - Run include.cmd.cmd to setup necessary variables.
   - Run step1_make_bmfc.cmd to generate `.tga`, `.bmfc`, `.fnt` files.
   - Check if only `.bmfc`, `.fnt`, `*_0.tga` files exists within a `fonts_new\` directory. If `*_1.tga` or with any higher value exists, that means that only characters from the first page (`*_0.tga`) will be converted so the output files, the `.dds`, and the `.abc` will be corrupted.
   - Run step2_make_abc.cmd to generate `.abc` files that X4 will understand our font maps.
   - Run step3_make_dds.cmd to generate texture maps in `.dds` files.
   - Within `fonts_new\` directory find desired `.dds` and `.abc` files. Default size is 32 pixels.
   - To replace default X4 font, please rename desired files to `Zekton_32.dds`, `Zekton_32.abc` and `Zekton Bold_32.dds`, `Zekton Bold_32.abc`. Create a new directories structure `assets\fx\gui\fonts` and place the `.abc` and `.dds` files there.


### Notes:

   - step4_pack.cmd is not used to replace the default X4 font but instead it creates and adds new paths in XR Rebirth format. I suppose that it won't work with X4 currently.
