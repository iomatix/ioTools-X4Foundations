local FNT = arg[1] or "fonts/rufont_32"
local S = arg[2] or 4.0 -- scale

local SF = -164  -- ¤ - fallback char
S = 1.0 / S


local w
local function uint16(v)
    local res = string.pack("H", v)
    w:write(res)
end
local function sint16(v)
    local res = string.pack("h", v)
    w:write(res)
end
local function uint32(v)
    local res = string.pack("I4", v)
    w:write(res)
end
local function float(v)
    local res = string.pack("f", v)
    w:write(res)
end


-- read .fnt

local r = assert(io.open(FNT..".fnt"))

local line = ""
local t1, t2, t3, t4, t5 = {}, {}, {}, {}, {}
-- 1st line
line = r:read("*l")
for k, v in string.gmatch(line, "(%w+)=(%w+)") do
    t1[k] = tonumber(v)
end
-- 2nd line
line = r:read("*l")
for k, v in string.gmatch(line, "(%w+)=(%w+)") do
    t2[k] = tonumber(v)
end
-- 3rd line
line = r:read("*l")
for k, v in string.gmatch(line, "(%w+)=(%w+)") do
    t3[k] = tonumber(v)
end
-- 4rd line
line = r:read("*l")
for k, v in string.gmatch(line, "(%w+)=(%w+)") do
    t4[k] = tonumber(v)
end
-- chars
local last = 0
for i = 1, t4.count do
    line = r:read("*l")
    local t = {}
    for k, v in string.gmatch(line, "(%a+)=([-%d]+)") do
        t[k] = tonumber(v)
    end
    table.insert(t5, t)
--    print(i, t.id)
    last = t.id
end

r:close()



print("total chars:", last)
local charIdx = {}
for i = 1, last do
    local s = string.pack("H", 0)
    table.insert(charIdx, s)
end

local chars = {}
local mf = math.floor
for k, v in ipairs(t5) do
    local p = t1.padding
    local w = v.width-p-p
    
    local x0 = (v.x+p) / t2.scaleW
    local y0 = (v.y+p) / t2.scaleH

    local x1 = -1 --w / t2.scaleW + x0
    local y1 = -1 --v.height / t2.scaleH + y0
    
    local off = mf((v.xoffset+p) * S)
    local width = mf(w * S)
    if width < 1.0 then width = 1.0 end
    local adv = mf(v.xadvance * S)
    local id = v.id

    table.insert(chars, { x0, y0, x1, y1, off, width, adv, v.page })

    local s = string.pack("H", k)
    charIdx[id] = s
    
    -- find fallback char
    if SF < 0 then
        if id + SF == 0 then SF = k end
    end

--    print(k, id, x0, y0, x1, y1, off, width, adv, v.page)
end


w = io.open(FNT..".abc", "w+b")

-- header

uint32(9)               -- ver
float(t1.size * S)      -- height, not used?
float(0.0)              -- outlineX, not used
float(0.0)              -- outlineY, not used
float(t2.lineHeight * S) -- line height
uint32(mf(t2.base * S)) -- base
uint32(11)              -- spacingX
uint32(11)              -- spacingY
uint32(0)               -- zero?
uint32(t2.scaleW * S)   -- texture width
uint32(t2.scaleH * S)   -- texture height

-- charCount
uint32(last)
w:write(table.concat(charIdx))

-- charDataCount
uint32(t4.count+1)

-- glyphs
local c = chars[SF]
float(c[1])
float(c[2])
float(c[3])
float(c[4])
sint16(c[5])
sint16(c[6])
sint16(c[7])
sint16(c[8])

for i = 1, last do
    local c = chars[i]
    if c then
        float(c[1])
        float(c[2])
        float(c[3])
        float(c[4])
        sint16(c[5])
        sint16(c[6])
        sint16(c[7])
        sint16(c[8])
    end
end

uint32(0)   -- WTF???

w:close()
