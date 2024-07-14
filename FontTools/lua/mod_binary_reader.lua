local bit = bit or bit32

BinaryReader = {
    f_handle = nil,
    f_size = 0
}

function BinaryReader:open(fullpath)
    self.f_handle = assert(io.open(fullpath, "rb"))
    self.f_size = self.f_handle:seek("end")
    self.f_handle:seek("set")
end

function BinaryReader:close()
    self.f_handle:close()
    self.f_handle = nil
    self.f_size = 0

end

function BinaryReader:pos()
   return self.f_handle:seek()
end

function BinaryReader:size()
    return self.f_size
end

function BinaryReader:seek(pos)
    return self.f_handle:seek("set", pos)
end

function BinaryReader:uint8()  -- unsigned byte
    local i8 = 0
    i8 = i8 + string.byte(self.f_handle:read(1))
    return i8
end

function BinaryReader:sint8()  -- signed byte
    local i8 = 0
    i8 = self:int8()
    if i8 > 127 then
        i8 = i8 - 256
    end
    return i8
end

function BinaryReader:uint16(endian_big)  -- unsigned short
    local i16 = 0
    if endian_big then
        i16 = i16 + self:uint8() * 2^8
        i16 = i16 + self:uint8() * 2^0
    else
        i16 = i16 + self:uint8() * 2^0
        i16 = i16 + self:uint8() * 2^8
    end
    return i16
end

function BinaryReader:sint16(endian_big)  -- signed short
    local i16 = 0
    i16 = self:uint16(endian_big)
    if i16 > 32767 then
        i16 = i16 - 65536
    end
    return i16
end

function BinaryReader:uint32(endian_big)  -- unsigned integer
    local i32 = 0
    if endian_big then
        i32 = i32 + self:uint8() * 2^24
        i32 = i32 + self:uint8() * 2^16
        i32 = i32 + self:uint8() * 2^8
        i32 = i32 + self:uint8() * 2^0
    else
        i32 = i32 + self:uint8() * 2^0
        i32 = i32 + self:uint8() * 2^8
        i32 = i32 + self:uint8() * 2^16
        i32 = i32 + self:uint8() * 2^24
    end
    return i32
end

function BinaryReader:sint32(endian_big)  -- signed integer
    local i32 = 0
    i32 = self:uint32(endian_big)
    if i32 > 2147483647 then
        i32 = i32 - 4294967296
    end
    return i32
end

function BinaryReader:hex32()  -- hex
    local h32 = ""
    h32 = string.format("%08X", self:uint32())
    return h32
end

-- only for luajit, Lua 5.2 have bit32.extract()
bit.extract = function(n, f, w)
    w = w or 1
    local mask = bit.lshift(4294967295, 1)
    mask = bit.lshift(mask, w - 1)
    mask = bit.bnot(mask)
    local r = bit.rshift(n, f)
    r = bit.band(r, mask)
    return r
end

function BinaryReader:float(endian_big)  -- float
    local x = self:uint32(endian_big)
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

function BinaryReader:double(endian_big)
    local xh = self:uint32(endian_big)
    local ml = self:uint32(endian_big)

    local mh = bit.extract(xh, 0, 20)
    local exp = bit.extract(xh, 20, 11) - 1023
    local sign = bit.extract(xh, 31, 1)
    if sign == 0 then sign = 1 else sign = -1 end

    local mul, res = 1, 1
    for i = 19, 0, -1 do
        mul = mul * 0.5
        res = bit.extract(mh, i) * mul + res
    end
    for i = 31, 0, -1 do
        mul = mul * 0.5
        res = bit.extract(ml, i) * mul + res
    end

    local f = 0.0
    if exp ~= -1023 and ml ~= 0 and mh ~= 0 then
        f = sign * res * math.pow(2, exp)
    end
    return f
end

function BinaryReader:str(len) -- string
    local str = nil
    if len ~= nil then
        str = self.f_handle:read(len)
    else
        local chars = {}
        local char = ""
        local zero = string.char(0x00)
        while char ~= zero do
            char = self.f_handle:read(1)
            table.insert(chars, char)
        end
        table.remove(chars)
        str = table.concat(chars)
    end
    return str
end

function BinaryReader:idstring(str)
    local len = string.len(str)
    local tmp = self:str(len)
    assert(str == tmp, "ERROR: " .. tmp .. " != " .. str)
end
