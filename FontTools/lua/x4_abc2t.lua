local filename = FNT

local r

-- binary reader for luajit
function uint8()
    local i8 = string.byte(r:read(1))
    return i8
end
local function uint16()
    local i16 = uint8() * 2^0 + uint8() * 2^8
    return i16 
end
local function sint16()
    local i16 = uint16()
    return i16 > 32767 and i16 - 65536 or i16
end
local function uint32()
    local i32 = uint8() * 2^0 + uint8() * 2^8 + uint8() * 2^16 + uint8() * 2^24
    return i32
end
local bit = bit or bit32
bit.extract = function(n, f, w)
    w = w or 1
    local mask = bit.lshift(4294967295, 1)
    mask = bit.lshift(mask, w - 1)
    mask = bit.bnot(mask)
    local r = bit.rshift(n, f)
    r = bit.band(r, mask)
    return r
end
local function float()
    local x = uint32()
    local mantissa = bit.extract(x, 0, 23)
    local exp = bit.extract(x, 23, 8) - 127
    local sign = bit.extract(x, 31, 1)
    if sign == 0 then sign = 1 else sign = -1 end
    local f = 0.0
    if     exp == 0 and mantissa == 0 then
        f = 1.0 * sign
    elseif exp ~= -127 then
        local mul, res = 1.0, 1.0
        for i = 22, 0, -1 do
            mul = mul * 0.5
            res = bit.extract(mantissa, i) * mul + res
        end
        f = sign * res * math.pow(2, exp)
    end
    return f
end

-- read .abc
r = assert(io.open(filename, "rb"))

local h = {
    [0] = uint32(),   -- ver
    [1] = float(),    -- height
    [2] = float(),    -- outX
    [3] = float(),    -- outY
    [4] = float(),    -- lineH
    [5] = uint32(),   -- base
    [6] = uint32(),   -- spcX
    [7] = uint32(),   -- spcY
    [8] = uint32(),   -- zero?
    [9] = uint32(),   -- texW
    [10] = uint32()   -- texH
}


local count = uint32()

local chars = 1
local charPtr = {}
for i = 0, count-1 do
    local ptr = uint16()
    
    if ptr > 0 then chars = chars + 1 end
    charPtr[i] = ptr
end


count = uint32()
assert(chars == count)

local charData = {}
local mf = math.floor
for i = 0, count-1 do
    local c = {}
    c.x0 = mf(float() * h[9])
    c.y0 = mf(float() * h[10])
    c.x1 = r:read(4)  -- skip
    c.y1 = r:read(4)  -- skip
    c.off = sint16()
    c.width = sint16()
    c.adv = sint16()
    c.page = uint16()
    charData[i] = c
end

charData[count] = h

r:close()

return charData
