package.path = "./?.lua;./lua/?.lua"
local content = [[
# AngelCode Bitmap Font Generator configuration file
fileVersion=1

# font settings
fontName=%s
fontFile=
charSet=0
fontSize=%d
aa=1
scaleH=100
useSmoothing=1
isBold=%d
isItalic=%d
useUnicode=1
disableBoxChars=1
outputInvalidCharGlyph=0
dontIncludeKerningPairs=1
useHinting=0
renderFromOutline=1
useClearType=0
autoFitNumPages=0
autoFitFontSizeMin=0
autoFitFontSizeMax=0

# character alignment
paddingDown=5
paddingUp=5
paddingRight=5
paddingLeft=5
spacingHoriz=5
spacingVert=5
useFixedHeight=1
forceZero=0
widthPaddingFactor=0.00

# output file
outWidth=%d
outHeight=%d
outBitDepth=8
fontDescFormat=0
fourChnlPacked=0
textureFormat=png
textureCompression=0
alphaChnl=%d
redChnl=%d
greenChnl=%d
blueChnl=%d
invA=0
invR=0
invG=0
invB=0

# outline
outlineThickness=%d

# selected chars
# RUS
# chars=32-126,169,174,1025,1040-1103,1105 
# LATIN
chars=32-126,160-382,402,508-511,567

# imported icon images
]]

function generate(fontname, size, bold, italic, outline, width, height)
    local a, r, g, b = 2, 4, 4, 4
    if outline > 0 then
        a, r, g, b = 1, 0, 0, 0
    end
    local txt = string.format(content, fontname, size, bold, italic, width, height, a, r, g, b, outline)
    return txt
end
