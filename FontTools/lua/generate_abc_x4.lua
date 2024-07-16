-- Lua script to generate .abc file for X4 Foundations from .fnt and config_fonts.lua
package.path = "./?.lua;./lua/?.lua"
require("mod_binary_writer")
require("config_fonts")

local success, config_fonts = pcall(require, "config_fonts")
if not success then
    print("Error loading config_fonts.lua:", config_fonts)
    return
end

local fontsDir = "./generated_fonts/"

local function uint16(v)
    return string.pack("H", v)
end

local function sint16(v)
    return string.pack("h", v)
end

local function uint32(v)
    return string.pack("I4", v)
end

local function float(v)
    return string.pack("f", v)
end

local function process_fnt_to_abc(fontName, fontSize, scale, fallbackChar)
    local scale = 1.0 / scale

    local fntFile = fontsDir .. fontName .. "_" .. fontSize .. ".fnt"
    local abcFile = fontsDir .. fontName .. "_" .. fontSize .. ".abc"

    local r = assert(io.open(fntFile, "r"))

    local line = ""
    local t1, t2, t3, t4, t5 = {}, {}, {}, {}, {}

    -- Read chars and parse them
    line = r:read("*l")
    for k, v in string.gmatch(line, "(%w+)=(%w+)") do
        t1[k] = tonumber(v)
    end

    line = r:read("*l")
    for k, v in string.gmatch(line, "(%w+)=(%w+)") do
        t2[k] = tonumber(v)
    end

    line = r:read("*l")
    for k, v in string.gmatch(line, "(%w+)=(%w+)") do
        t3[k] = tonumber(v)
    end

    line = r:read("*l")
    for k, v in string.gmatch(line, "(%w+)=(%w+)") do
        t4[k] = tonumber(v)
    end

    local last = 0
    for i = 1, t4.count do
        line = r:read("*l")
        local t = {}
        for k, v in string.gmatch(line, "(%a+)=([-%d]+)") do
            t[k] = tonumber(v)
        end
        table.insert(t5, t)
        last = t.id
    end

    r:close()

    print("Total chars: " .. last)

    local charIdx = {}
    for i = 1, last do
        charIdx[i] = uint16(0)
    end

    local chars = {}
    local mf = math.floor

    for k, v in ipairs(t5) do
        local p = t1.padding
        local w = v.width - p - p

        local x0 = (v.x + p) / t2.scaleW
        local y0 = (v.y + p) / t2.scaleH
        local x1 = -1
        local y1 = -1

        local off = mf((v.xoffset + p) * scale)
        local width = mf(w * scale)
        if width < 1.0 then
            width = 1.0
        end
        local adv = mf(v.xadvance * scale)
        local id = v.id

        table.insert(chars, { x0, y0, x1, y1, off, width, adv, v.page })

        charIdx[id] = uint16(k)

        -- Find fallback char
        if fallbackChar < 0 then
            if id + fallbackChar == 0 then
                fallbackChar = k
            end
        end
    end

    local w = assert(io.open(abcFile, "w+b"))

    -- Write header
    w:write(uint32(9))                    -- ver
    w:write(float(t1.size * scale))       -- height, not used?
    w:write(float(0.0))                   -- outlineX, not used
    w:write(float(0.0))                   -- outlineY, not used
    w:write(float(t2.lineHeight * scale)) -- line height
    w:write(uint32(mf(t2.base * scale)))  -- base
    w:write(uint32(11))                   -- spacingX
    w:write(uint32(11))                   -- spacingY
    w:write(uint32(0))                    -- zero?
    w:write(uint32(t2.scaleW * scale))    -- texture width
    w:write(uint32(t2.scaleH * scale))    -- texture height

    -- charCount
    w:write(uint32(last))
    w:write(table.concat(charIdx))

    -- charDataCount
    w:write(uint32(t4.count + 1))

    -- glyphs
    local c = chars[fallbackChar]
    w:write(float(c[1]))
    w:write(float(c[2]))
    w:write(float(c[3]))
    w:write(float(c[4]))
    w:write(sint16(c[5]))
    w:write(sint16(c[6]))
    w:write(sint16(c[7]))
    w:write(sint16(c[8]))

    for i = 1, last do
        local c = chars[i]
        if c then
            w:write(float(c[1]))
            w:write(float(c[2]))
            w:write(float(c[3]))
            w:write(float(c[4]))
            w:write(sint16(c[5]))
            w:write(sint16(c[6]))
            w:write(sint16(c[7]))
            w:write(sint16(c[8]))
        end
    end

    w:write(uint32(0)) -- kernings
    w:close()

    print("Generated ABC file: " .. abcFile)
end



-- Main process
if type(Fonts) == "table" then
    for k, v in pairs(Fonts) do
        for kk, vv in ipairs(v) do
            for kkk, vvv in pairs(vv.new_size) do
                
                -- -164 ¤ - fallback char
                process_fnt_to_abc(v.fontname .. vv.suffix, vv.new_size[kkk], vv.scale, -164)
                print("generated_fonts/" .. v.fontname .. vv.suffix .. "_" .. vvv .. ".abc")

            end
        end
    end
else
    print("Error: config_fonts.Fonts is not a table.")
end

print("[LOG OK] Font descriptors are ready.")
