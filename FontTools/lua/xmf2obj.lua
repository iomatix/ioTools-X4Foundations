package.path = "./?.lua;./lua/?.lua"

if arg[1] == nil then
    io.write("\n[INFO] usage: luajit xmf2obj.lua path_to_xml [output_path [output_name|dump|-v32]]\n\n")
    os.exit()
end
local OUTDIR = arg[2] or "."
local OUTNAME = arg[3] or "out"
local V32 = false
if arg[3] == "-v32" then
    V32 = true
    OUTNAME = "out"
end

local ffi = require("ffi")
local zlib = ffi.load("zlib1")
ffi.cdef[[
int uncompress(uint8_t *dest, unsigned long *destLen,
               const uint8_t *source, unsigned long sourceLen);
]]
local function uncompress(comp, n)
    local buf = ffi.new("uint8_t[?]", n)
    local buflen = ffi.new("unsigned long[1]", n)
    local res = zlib.uncompress(buf, buflen, comp, #comp)
    assert(res == 0)
    return buf
end

require("mod_binary_reader")
local r = BinaryReader
r:open(arg[1])

if r:size() < 4 then
    r:close()
    io.write("[ERR] size < 4: " .. arg[1] .. ", exiting\n")
    os.exit()
end

r:idstring("XUMF")

local header    = {}    -- header
local chunk     = {}    -- chunks
local vertex    = {}    -- vertices
local vertex2   = {}    -- vertices
local uv        = {}    -- UV
local uv2       = {}    -- UV for decals ???
local normal    = {}    -- normals
local tangent   = {}    -- tangents (tangents ???)
local vcolor    = {}    -- vertex colors
local index     = {}    -- indexes
local material  = {}    -- materials


-------------------------------------------------------------------------------
-- header
-------------------------------------------------------------------------------

header.ver1         = r:uint16()    -- 0x0003 (3)
header.ver2         = r:uint16()    -- 0x0040 (64)
header.chunk_count  = r:uint8()     --
header.chunk_size   = r:uint8()     -- 0x38/0xBC (56/188)
material.count      = r:uint8()     -- materials
header.unk1_1       = r:uint8()     -- 0x88 (136)
header.unk1_2       = r:uint8()     -- 0x01
header.unk1_3       = r:uint8()     -- 0x00
vertex.count        = r:uint32()
index.count         = r:uint32()
header.unk1_4       = r:uint32()    -- 0x00000004
header.unk1_5       = r:uint16()    -- 0x0001 | 0x0000 for *-collision.xmf
r:seek(64)                      -- skip 36 0x00


-------------------------------------------------------------------------------
-- chunks
-------------------------------------------------------------------------------

for i = 1, header.chunk_count do
    local t = {}
    t.id1       = r:uint32()    -- 0|2|3|4|6|8|30
    t.part      = r:uint32()    -- 0|1|2|3|4
    t.offset    = r:uint32()
    t.one1      = r:uint32()
    t.zero      = r:uint32()
    t.id2       = r:uint32()    -- 1|2|4|15|16|30|31|32
    t.packed    = r:uint32()
    t.qty       = r:uint32()
    t.bytes     = r:uint32()    -- 2|4|8|12|16|20|24|28|32|36|40|44|48|60|64
    t.one2      = r:uint32()
    if     header.chunk_size == 56 then
        -- unknown bytes
        r:seek(r:pos() + 16)
    elseif header.chunk_size == 188 then
        -- unknown bytes
        r:seek(r:pos() + 148)
    else
        assert(false, "[ERR] strange chunk size: " .. header.chunk_size)
    end
    table.insert(chunk, t)
end


-------------------------------------------------------------------------------
-- materials
-------------------------------------------------------------------------------

if material.count > 0 then
    for i = 1, material.count do
        local jmp = r:pos() + 136
        local t = {}
        t.begin = r:uint32()
        t.count = r:uint32()
        t.name = string.gsub(r:str(), "%.", "_")
        table.insert(material, t)
        r:seek(jmp)
    end
end


-------------------------------------------------------------------------------
-- parse done, show info
-------------------------------------------------------------------------------

io.write("\n==== xmf info: ==============\n")
io.write("chunk headers:\t" .. header.chunk_count .. " x " .. header.chunk_size .. " bytes\n")
io.write("     vertices:\t" .. vertex.count .. "\n")
io.write("      indexes:\t" .. index.count .. "\n")
io.write("        faces:\t" .. index.count/3 .. "\n")
io.write("    materials:\t" .. material.count .. "\n")
io.write("\n= chunks info: ======================\n")
io.write("id1\tpart\tid2\tqty\tbytes\n")
io.write("-------------------------------------\n")
for k, v in ipairs(chunk) do
    io.write(v.id1 .. "\t" .. v.part .. "\t" .. v.id2 .. "\t" ..v.qty .. "\t x " .. v.bytes)
    io.write("\n")
end

if material.count > 0 then
    io.write("\n= materials: =========================\n")
    io.write("start\tcount\tname\n")
    io.write("--------------------------------------\n")
    for k, v in ipairs(material) do
        io.write(v.begin .. "\t" .. v.count .. "\t" .. v.name .. "\n")
    end
end
io.write("\n")

if material.count == 0 then
    local t = {}
    t.begin = 0
    t.count = index.count
    t.name = "default"
    table.insert(material, t)
end


-------------------------------------------------------------------------------
-- unpack and parse chunks
-------------------------------------------------------------------------------

ffi.cdef[[
typedef union {
      unsigned int uint32;
        signed int sint32;
    unsigned short uint16;
      signed short sint16;
     unsigned char uint8;
       signed char sint8;
             float float32;
     unsigned char src[4];
} unitConverter;
]]
local uc = ffi.new("unitConverter")

local function bit_extract (n, f, w)
    w = w or 1
    local mask = bit.lshift(4294967295, 1)
    mask = bit.lshift(mask, w - 1)
    mask = bit.bnot(mask)
    local r = bit.rshift(n, f)
    r = bit.band(r, mask)
    return r
end

local ptr = 0

local function float16(buf)
    uc.src[0] = buf[ptr + 0]
    uc.src[1] = buf[ptr + 1]
    uc.src[2] = 0
    uc.src[3] = 0
    local x = uc.uint32
    local mantissa = bit.extract(x, 0, 10)
    local exp      = bit.extract(x, 10, 5) - 15 + 127
    local sign     = bit.extract(x, 15, 1)
    x = sign
    x = bit.lshift(x, 8)
    x = bit.bor(x, exp)
    x = bit.lshift(x, 10)
    x = bit.bor(x, mantissa)
    x = bit.lshift(x, 13)
    uc.uint32 = x
    ptr = ptr + 2
    return uc.float32
end
local function float32(buf)
    uc.src[0] = buf[ptr + 0]
    uc.src[1] = buf[ptr + 1]
    uc.src[2] = buf[ptr + 2]
    uc.src[3] = buf[ptr + 3]
    ptr = ptr + 4
    return uc.float32
end
local function uint32(buf)
    uc.src[0] = buf[ptr + 0]
    uc.src[1] = buf[ptr + 1]
    uc.src[2] = buf[ptr + 2]
    uc.src[3] = buf[ptr + 3]
    ptr = ptr + 4
    return uc.uint32
end
local function uint16(buf)
    uc.src[0] = buf[ptr + 0]
    uc.src[1] = buf[ptr + 1]
    ptr = ptr + 2
    return uc.uint16
end


local function read_vertex_float16(_data)
    table.insert(vertex, -float16(_data))  -- mirror X axis
    table.insert(vertex,  float16(_data))
    table.insert(vertex,  float16(_data))
    -- 0000
    ptr = ptr + 2
end

local function read_vertex_float32(_data)
    table.insert(vertex, -float32(_data))         -- mirror X axis
    table.insert(vertex,  float32(_data))
    table.insert(vertex,  float32(_data))
end

local function read_normal_float16(_data)
    table.insert(normal, (127 - _data[ptr + 2]) / 128)    -- swap XZ
    table.insert(normal, (_data[ptr + 1] - 127) / 128)
    table.insert(normal, (_data[ptr + 0] - 127) / 128)
    -- 00|FF ???
    ptr = ptr + 4
end

local function read_tangent_float16(_data)
    table.insert(tangent, (127 - _data[ptr + 2]) / 128)  -- swap XZ
    table.insert(tangent, (_data[ptr + 1] - 127) / 128)
    table.insert(tangent, (_data[ptr + 0] - 127) / 128)
    -- 00|FF ???
    ptr = ptr + 4
end

local function read_uv_float16(_data)
    table.insert(uv,       float16(_data))
    table.insert(uv, 1.0 - float16(_data))        -- mirror X axis
end

local function read_uv2_float16(_data)
    table.insert(uv2,       float16(_data))
    table.insert(uv2, 1.0 - float16(_data))       -- mirror X axis
end

local function read_index_uint16(_data)
    table.insert(index, uint16(_data) + 1)
    table.insert(index, uint16(_data) + 1)
    table.insert(index, uint16(_data) + 1)
end

local function read_index_uint32(_data)
    table.insert(index, uint32(_data) + 1)
    table.insert(index, uint32(_data) + 1)
    table.insert(index, uint32(_data) + 1)
end



io.write("\nparse chunks data...\n")
chunk.data_start = r:pos()
for k, v in ipairs(chunk) do
    local unpacked  = v.qty * v.bytes
    local buf       = r:str(v.packed)
    local data      = uncompress(buf, unpacked) -- uint8_t[]
    ptr = 0
    io.write(string.format("%d-%d-%d-%d:\t", v.id1, v.part, v.id2, v.bytes))

    if     v.id1 == 0 and v.part == 0 and v.id2 == 2 and v.bytes == 12 then
        io.write("OK, vertices (3*float32)...\n")
        while ptr < unpacked do
            read_vertex_float32(data)  -- 8
        end

    elseif v.id1 == 0 and v.part == 0 and v.id2 == 16 and v.bytes == 8 then
        io.write("test, vertices (3*float16)...\n")
        while ptr < unpacked do
            read_vertex_float16(data)  -- 8
        end
    elseif v.id1 == 3 and v.part == 0 and v.id2 == 4 and v.bytes == 4 then
        io.write("test, normal (3*byte)...\n")
        while ptr < unpacked do
            read_normal_float16(data)  -- 8
        end
    elseif v.id1 == 4 and v.part == 0 and v.id2 == 4 and v.bytes == 4 then
        io.write("test, tangent (3*byte)...\n")
        while ptr < unpacked do
            read_tangent_float16(data)  -- 8
        end
    elseif v.id1 == 6 and v.part == 0 and v.id2 == 15 and v.bytes == 4 then
        io.write("test, uv (3*float16)...\n")
        while ptr < unpacked do
            read_uv_float16(data)  -- 8
        end

    elseif v.id1 == 0 and v.part == 0 and v.id2 == 32 and v.bytes == 12 then
        io.write("OK, vertices (3*float16), normals (3*byte)...\n")
        while ptr < unpacked do
            read_vertex_float16(data)  -- 8
            read_normal_float16(data)  -- 4
        end
    elseif v.id1 == 0 and v.part == 0 and v.id2 == 32 and v.bytes == 20 then
        io.write("OK, vertices (3*float16), 2 x normals (3*byte), uv (2*float16), 4 bytes ???...\n")
        while ptr < unpacked do
            read_vertex_float16(data)  -- 8
            read_normal_float16(data)  -- 4
            read_tangent_float16(data) -- 4
            read_uv_float16(data)      -- 4
        end
    elseif v.id1 == 0 and v.part == 0 and v.id2 == 32 and v.bytes == 24 then
        io.write("OK, vertices (3*float16), 2 x normals (3*byte), uv (2*float16), 4 bytes ???...\n")
        while ptr < unpacked do
            read_vertex_float16(data)  -- 8
            read_normal_float16(data)  -- 4
            read_tangent_float16(data) -- 4
            read_uv_float16(data)      -- 4
            -- xxxxxxxx
            ptr = ptr + 4
        end
    elseif v.id1 == 0 and v.part == 0 and v.id2 == 32 and v.bytes == 28 then
        io.write("OK, vertices")
        if V32 == true then
            io.write(" (3*float32), 2 x normals (3*byte), uv (2*float16), 8 bytes ???...\n")
        else
            io.write(" (3*float16), 2 x normals (3*byte), uv (2*float16), 8 bytes ???...\n")
        end
        while ptr < unpacked do
            if V32 == true then
                read_vertex_float32(data)  -- 12
            else
                read_vertex_float16(data)  -- 8
            end
            read_normal_float16(data)      -- 4
            read_tangent_float16(data)     -- 4
            read_uv_float16(data)          -- 4
            -- xxxxxxxx
            ptr = ptr + 4
            if V32 ~= true then
                -- xxxxxxxx
                ptr = ptr + 4
            end
        end
    elseif v.id1 == 0 and v.part == 0 and v.id2 == 32 and v.bytes == 32 then
        io.write("OK, vertices")
        if V32 == true then
            io.write(" (3*float32), 2 x normals (3*byte), uv (2*float16), 12 bytes ???...\n")
        else
            io.write(" (3*float16), 2 x normals (3*byte), uv (2*float16), 12 bytes ???...\n")
        end
        while ptr < unpacked do
            if V32 == true then
                read_vertex_float32(data)  -- 12
            else
                read_vertex_float16(data)  -- 8
            end
            read_normal_float16(data)      -- 4
            read_tangent_float16(data)     -- 4
            read_uv_float16(data)          -- 4
            -- xxxxxxxx
            -- xxxxxxxx
            ptr = ptr + 8
            if V32 ~= true then
                -- xxxxxxxx
                ptr = ptr + 4
            end
        end
    elseif v.id1 == 0 and v.part == 0 and v.id2 == 32 and v.bytes == 36 then
        io.write("OK, vertices (3*float32), 2 x normals (3*byte), uv (2*float16), 12 bytes ???...\n")
        while ptr < unpacked do
            read_vertex_float32(data)      -- 12
            read_normal_float16(data)      -- 4
            read_tangent_float16(data)     -- 4
            read_uv_float16(data)          -- 4
            -- xxxxxxxx
            -- xxxxxxxx
            -- xxxxxxxx
            ptr = ptr + 12
        end
    elseif v.id1 == 0 and v.part == 0 and v.id2 == 32 and v.bytes == 40 then
        io.write("OK, vertices (3*float32), 2 x normals (3*byte), uv (2*float16), 16 bytes ???...\n")
        while ptr < unpacked do
            read_vertex_float32(data)      -- 12
            read_normal_float16(data)      -- 4
            read_tangent_float16(data)     -- 4
            read_uv_float16(data)          -- 4
            -- xxxxxxxx
            -- xxxxxxxx
            -- xxxxxxxx
            -- xxxxxxxx
            ptr = ptr + 16
        end
    elseif v.id1 == 30 and v.part == 0 and v.id2 == 30 and v.bytes == 2 then
        io.write("OK, indexes (2 bytes)...\n")
        while ptr < unpacked do
            read_index_uint16(data)        -- 6
        end
    elseif v.id1 == 30 and v.part == 0 and v.id2 == 31 and v.bytes == 4 then
        io.write("OK, indexes (4 bytes)...\n")
        while ptr < unpacked do
            read_index_uint32(data)        -- 12
        end
--[[
    elseif v.id1 == XX and v.part == XX and v.id2 == XX and v.bytes == XX then
    --
    --
]]
    else
        io.write("FAIL, unknown, skip...\n")
    end
end
assert(r:pos() == r:size(), "[ERR] pos != filesize: " .. r:pos() .. " != " .. r:size())



-------------------------------------------------------------------------------
-- dump unknown chunks data
-------------------------------------------------------------------------------

os.execute("del /q /f " .. OUTDIR .. "\\chunk*.bin >nul 2>&1")
if #vertex == 0 or OUTNAME == "dump" then
    io.write("\n[ERR] vertex buffer empty\ndump unpacked data? [(Y)es or Enter to exit]: ")
    if io.read() ~= "Y" then
        r:close()
        io.write("-----------------------------------------------------------------\n\n\n")
        os.exit()
    end
    -- extract chunks data
    r:seek(chunk.data_start)
    io.write("\nunpack chunk data....")
    for k, v in ipairs(chunk) do
        io.write(" " .. k .. "...")
        local name = string.format("%s/chunkdata#%d_(%d_%d_%d)_%dx%d.bin",
                                   OUTDIR, k, v.id1, v.part, v.id2, v.qty, v.bytes)
        local buf = r:str(v.packed)
        local unpacked = v.qty * v.bytes
        local data = ffi.string(uncompress(buf, unpacked), unpacked)
        local w = assert(io.open(name, "w+b"))
        w:write(data)
        w:close()
    end
    io.write(" done\n")
    assert(r:pos() == r:size(), "[ERR] pos != filesize: " .. r:pos() .. " != " .. r:size())
    -- copy binary chunk headers
    r:seek(64)  -- jump back to begin
    io.write("copy chunk headers...")
    for i = 1, header.chunk_count do
        io.write(" " .. i .. "...")
        local name = string.format("%s/chunk#%d.bin", OUTDIR, i)
        local data = r:str(header.chunk_size)
        local w = assert(io.open(name, "w+b"))
        w:write(data)
        w:close()
    end
    io.write(" done\n")
    r:close()
    os.exit()
end

r:close()



-------------------------------------------------------------------------------
-- generate obj
-------------------------------------------------------------------------------
io.write("\ngenerate obj... ")

local color = {
    "0.00 0.33 0.64", "1.00 0.95 0.00", "0.93 0.11 0.14",
    "0.00 0.57 0.81", "1.00 0.76 0.06", "0.89 0.25 0.59",
    "0.00 0.66 0.56", "0.97 0.56 0.12", "0.65 0.27 0.60",
    "0.55 0.99 0.03", "0.95 0.44 0.13", "0.42 0.26 0.61"
}

local w = assert(io.open(OUTDIR .. "/" .. OUTNAME .. ".mtl", "w+"))
for k, v in ipairs(material) do
    w:write("newmtl " .. v.name .. "\n\n")
    --w:write("Kd " .. color[k] .. "\n")
    w:write("Ka 0.00 0.00 0.00\n")
    w:write("Kd 1.00 1.00 1.00\n")
    w:write("Ks 1.00 1.00 1.00\n")
    w:write("Ns 4.0\n")
    w:write("illum 2\n")
    if material.count > 0 then
        w:write("map_Kd tex\\" .. v.name .. "_diff.tga\n")
        w:write("map_Ks tex\\" .. v.name .. "_spec.tga\n")
        w:write("map_bump tex\\" .. v.name .. "_bump.tga\n")
    end
    w:write("\n\n")
end
w:close()


w = assert(io.open(OUTDIR .. "/" .. OUTNAME .. ".obj", "w+"))
w:write("mtllib ".. OUTNAME .. ".mtl\n\n")

-- vertices
w:write("# " .. vertex.count .. " vertices\n")
for i = 1, vertex.count*3, 3 do
    w:write(string.format("v %f %f %f", vertex[i], vertex[i+1], vertex[i+2]))
    if #vcolor > 0 then
        w:write(string.format(" %f %f %f %f", vcolor[i], vcolor[i+1], vcolor[i+2], vcolor[i+3]))
    end
    w:write("\n")
end
w:write("\n")

-- uv
if #uv > 0 then
    w:write("# " .. #uv/2 .. " UV coordinates\n")
    for i = 1, vertex.count*2, 2 do
        w:write(string.format("vt %f %f\n", uv[i], uv[i+1]))
    end
end
w:write("\n")

--[[
if #uv2 > 0 then
    w:write("# " .. #uv2/2 .. " UV2 coordinates\n")
    for i = 1, vertex.count*2, 2 do
        --w:write(string.format("vt %f %f\n", uv2[i], uv2[i+1]))
    end
end
w:write("\n")
]]

-- normals
if #normal > 0 then
    w:write("# " .. #normal/3 .. " normals\n")
    for i = 1, vertex.count*3, 3 do
        w:write(string.format("vn %f %f %f\n", normal[i], normal[i+1], normal[i+2]))
    end
end
w:write("\n")

--[[
if #tangent > 0 then
    w:write("# " .. #tangent/3 .. " tangents\n")
    for i = 1, vertex.count*3, 3 do
        w:write(string.format("#vn2 %f %f %f\n", tangent[i], tangent[i+1], tangent[i+2]))
    end
end
w:write("\n")
]]

-- faces
for k, v in ipairs(material) do
    w:write("g group" .. k .. "\n")
    w:write("usemtl " .. v.name .. "\n")
    if #normal > 0 and #uv > 0 then
        for i = v.begin+1, v.begin + v.count, 3 do
            w:write(string.format("f %d/%d/%d %d/%d/%d %d/%d/%d\n",
                index[i],   index[i],   index[i],
                index[i+1], index[i+1], index[i+1],
                index[i+2], index[i+2], index[i+2]))
        end
    elseif #uv > 0 then
        for i = v.begin+1, v.begin + v.count, 3 do
            w:write(string.format("f %d/%d %d/%d %d/%d\n",
                index[i],   index[i],
                index[i+1], index[i+1],
                index[i+2], index[i+2]))
        end
    elseif #normal > 0 then
        for i = v.begin+1, v.begin + v.count, 3 do
            w:write(string.format("f %d//%d %d//%d %d//%d\n",
                index[i],   index[i],
                index[i+1], index[i+1],
                index[i+2], index[i+2]))
        end
    else
        for i = v.begin+1, v.begin + v.count, 3 do
            w:write(string.format("f %d %d %d\n",
                index[i], index[i+1], index[i+2]))
        end
    end
end

w:close()
io.write("done ------------------------------------------------------------\n\n\n")
