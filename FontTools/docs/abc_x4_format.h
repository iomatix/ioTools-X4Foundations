// header
int version;        // 9
float height;
float outlineX;     // 0.0. not used?
float outlineY;     // 0.0, not used?
float lineHeight;
int base;
int spacingX;
int spacingY;
int zero1;          // 0
int textureWidth;
int textureHeight;

// pointers
int ptrCount;
// array of pointers to char data. 0 - no data/no glyph, in this case used 'default' char (charData[31])
short charPtrs[ptrCount];

// char data
int charDataCount;
struct charData_s {
    float x0;
    float y0;
    float x1;       // not used
    float y1;       // not used
    short xOffset;
    short width;
    short xAdvance;
    short page;     // 0
}
charData_s chardData[charDataCount];

int zero2; // 0, padding?
