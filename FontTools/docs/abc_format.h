// header
int unknown1;       // 0x00000008
float height;
float outlineX;
float outlineY;
float lineHeight;
int base;
int spacingX;       // ~= lineHeight/4 ???
int spacingY;       // ~= base/4 ???
int unknown2;       // 0x00000000
int textureWidth;
int textureHeight;

// char codes
int charCount;
short charCode[charCount];  // first 30 values = 0x0000

// char data
int charDataCount;          // = charCount - 30
{
    float x0;
    float y0;
    float x1;
    float y1;
    short xOffset;
    short width;
    short xAdvance;
    short page;         // 0x0001
}
// ...
// repeat (charDataCount) times