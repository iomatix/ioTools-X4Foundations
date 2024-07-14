package.path = "./?.lua;./lua/?.lua"
require("mod_binary_writer")
require("config_fonts")

local S = arg[1] or 4.0 -- Default scale factor if not provided via command-line argument
local SF = -164  -- Default fallback character offset
S = 1.0 / S  -- Scale factor inversion

-- Utility functions for writing binary data
local function uint16(w, v)
    w:write(string.char(v % 256, math.floor(v / 256)))
end

local function sint16(w, v)
    if v < 0 then v = v + 65536 end
    w:write(string.char(v % 256, math.floor(v / 256)))
end

local function uint32(w, v)
    w:write(string.char(v % 256, math.floor(v / 256) % 256, math.floor(v / 65536) % 256, math.floor(v / 16777216)))
end

local function float(w, v)
    local sign = 0
    if v < 0 then sign = 1; v = -v end
    local mantissa, exponent = math.frexp(v)
    if v == 0 then
        mantissa, exponent = 0, 0
    else
        mantissa = (mantissa * 2 - 1) * 2^23
        exponent = exponent + 126
    end
    local b1 = sign * 128 + math.floor(exponent / 2^1)
    local b2 = (exponent % 2) * 128 + math.floor(mantissa / 2^16)
    local b3 = math.floor(mantissa / 2^8) % 256
    local b4 = mantissa % 256
    w:write(string.char(b4, b3, b2, b1))
end

-- Function to read and parse .fnt file
local function read_fnt_file(fnt_name)
    local r = assert(io.open(fnt_name .. ".fnt"))
    local t1, t2, t3, t4, t5 = {}, {}, {}, {}, {}

    -- Parses a line of key-value pairs into a table
    local function parse_line_to_table(line, tbl)
        for k, v in string.gmatch(line, "(%w+)=(%w+)") do
            tbl[k] = tonumber(v)
        end
    end

    -- Read and parse each of the four header lines
    parse_line_to_table(r:read("*l"), t1)
    parse_line_to_table(r:read("*l"), t2)
    parse_line_to_table(r:read("*l"), t3)
    parse_line_to_table(r:read("*l"), t4)

    -- Read and parse character data lines
    for i = 1, t4.count do
        local t = {}
        parse_line_to_table(r:read("*l"), t)
        table.insert(t5, t)
    end

    r:close()
    return t1, t2, t3, t4, t5
end

-- Function to process character data from the .fnt file
local function process_char_data(t1, t2, t5, last)
    local charIdx = {}
    local chars = {}
    local mf = math.floor

    -- Initialize character index table with default values
    for i = 1, last do
        table.insert(charIdx, string.char(0, 0))
    end

    -- Process each character's data
    for k, v in ipairs(t5) do
        local p = t1.padding or 0
        local width = (v.width or 0) - p - p

        local x0 = ((v.x or 0) + p) / (t2.scaleW or 1)
        local y0 = ((v.y or 0) + p) / (t2.scaleH or 1)

        local x1, y1 = -1, -1  -- Placeholder values for x1 and y1

        -- Calculate scaled values for character properties
        local off = mf(((v.xoffset or 0) + p) * S)
        local width_scaled = mf(width * S)
        if width_scaled < 1.0 then width_scaled = 1.0 end
        local adv = mf((v.xadvance or 0) * S)
        local id = v.id

        -- Insert processed character data into table
        table.insert(chars, { x0, y0, x1, y1, off, width_scaled, adv, v.page })

        -- Store index of each character by its ID
        charIdx[id] = string.char(k % 256, math.floor(k / 256))

        -- Find fallback character based on SF value
        if SF < 0 and id + SF == 0 then
            SF = k
        end
    end

    return charIdx, chars
end

-- Function to write the .abc file
local function write_abc_file(fnt_name, t1, t2, last, charIdx, chars)
    local w = io.open(fnt_name .. ".abc", "w+b")

    -- Write header data
    uint32(w, 9)               -- Version number
    float(w, (t1.size or 0) * S)      -- Font size (scaled)
    float(w, 0.0)              -- Outline X (not used)
    float(w, 0.0)              -- Outline Y (not used)
    float(w, (t2.lineHeight or 0) * S) -- Line height (scaled)
    uint32(w, math.floor((t2.base or 0) * S)) -- Base line (scaled)
    uint32(w, 11)              -- Horizontal spacing
    uint32(w, 11)              -- Vertical spacing
    uint32(w, 0)               -- Reserved value
    uint32(w, (t2.scaleW or 0) * S)   -- Texture width (scaled)
    uint32(w, (t2.scaleH or 0) * S)   -- Texture height (scaled)

    -- Write character count and indices
    uint32(w, last)            -- Total number of characters
    w:write(table.concat(charIdx))
    
    -- Write character data count
    uint32(w, #chars + 1)

    -- Write fallback character data first
    local c = chars[SF]
    float(w, c[1])
    float(w, c[2])
    float(w, c[3])
    float(w, c[4])
    sint16(w, c[5])
    sint16(w, c[6])
    sint16(w, c[7])
    sint16(w, c[8])

    -- Write data for all other characters
    for i = 1, last do
        local c = chars[i]
        if c then
            float(w, c[1])
            float(w, c[2])
            float(w, c[3])
            float(w, c[4])
            sint16(w, c[5])
            sint16(w, c[6])
            sint16(w, c[7])
            sint16(w, c[8])
        end
    end

    uint32(w, 0)   -- Terminator or reserved value
    w:close()
end

-- Iterate over all fonts defined in config_fonts and process each one
for k, v in pairs(Fonts) do
    for kk, vv in ipairs(v) do
        io.write(k .. vv.suffix .. ": ")
        for _, size in ipairs(vv.size) do
            io.write(size .. " ")
            local fnt_name = "./fonts_new/" .. k .. vv.suffix .. "_" .. size
            local t1, t2, t3, t4, t5 = read_fnt_file(fnt_name)
            local last = #t5
            local charIdx, chars = process_char_data(t1, t2, t5, last)
            write_abc_file(fnt_name, t1, t2, last, charIdx, chars)
        end
        io.write("\n")
    end
end
