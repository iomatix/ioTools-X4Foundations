package.path = "./?.lua;./lua/?.lua"
local bit = bit or bit32

BinaryWriter = {
    f_handle = nil,
    f_size = 0
}

function BinaryWriter:open(fullpath)
    self.f_handle = assert(io.open(fullpath, "w+b"))
end

function BinaryWriter:update(fullpath)
    self.f_handle = assert(io.open(fullpath, "r+b"))
    self.f_size = self.f_handle:seek("end")
    self.f_handle:seek("set")
end

function BinaryWriter:append(fullpath)
    self.f_handle = assert(io.open(fullpath, "a+b"))
end

function BinaryWriter:close()
    self.f_handle:close()
    self.f_handle = nil
    self.f_size = 0
end

function BinaryWriter:pos()
    return self.f_handle:seek()
end

function BinaryWriter:seek(pos)
    return self.f_handle:seek("set", pos)
end

function BinaryWriter:size()
    return self.f_size
end

function BinaryWriter:uint8(byte)
    local i8 = string.char(byte)
    self.f_handle:write(i8)
end

function BinaryWriter:sint8(byte)
    if byte < 0 then
        byte = 256 - int
    end
    self:uint8(byte)
end

function BinaryWriter:uint16(short, endian_big)
    local i82 = string.char(bit32.rshift(short, 8))
    local i81 = string.char(bit32.band(short, 0xff))
    local out = ""
    if endian_big then
        out =  i82 .. i81
    else
        out =  i81 .. i82
    end
    self.f_handle:write(out)
end

function BinaryWriter:sint16(short, endian_big)
    if short < 0 then
        short = 65536 + short
    end
    self:uint16(short, endian_big)
end

function BinaryWriter:uint32(int, endian_big)
    local i84 = string.char(         bit.rshift(int, 24)       )
    local i83 = string.char(bit.band(bit.rshift(int, 16), 0xff))
    local i82 = string.char(bit.band(bit.rshift(int, 8),  0xff))
    local i81 = string.char(bit.band(           int,      0xff))
    local out = ""
    if endian_big then
        out =  i84 .. i83 .. i82 .. i81
    else
        out =  i81 .. i82 .. i83 .. i84
    end
    self.f_handle:write(out)
end

function BinaryWriter:sint32(int, endian_big)
    if int < 0 then
        int = 4294967296 - int
    end
    self:uint32(int, endian_big)
end


function BinaryWriter:float(float)
    if float == 0.0 then
        BinaryWriter:uint32(0)
        return
    end
    local f = 0
    local sign = 0
    if float < 0.0 then
        sign = 1
        float = -float
    end
    f = bit32.replace(f, sign, 31, 1)

    local exp = math.floor(math.log(float, 2))
    local mantissa = (float / math.pow(2, exp))
    exp = exp + 127
    f = bit32.replace(f, exp, 23, 8)

    local m = mantissa - 1
    for i = 22, 0, -1 do
        m = m * 2.0
        if m >= 1.0 then
            m = m - 1.0
            f = bit32.replace(f, 1, i, 1)
        end
        if m == 0.0 then
            break
        end
    end

    BinaryWriter:uint32(f)
end

function BinaryWriter:str(str)
    self.f_handle:write(str)
    --BinaryWriter:int8(0)
end
