-- Lua script to generate .abc file for X4 Foundations from .fnt and config_fonts.lua
package.path = "./?.lua;./lua/?.lua"
require("mod_binary_writer")
require("config_fonts")

-- Function to process character data
local function process_char_data(fnt_name, S, SF)
    local r = assert(io.open(fnt_name .. ".fnt", "r"))

    local line = ""
    local t1, t2, t3, t4, t5 = {}, {}, {}, {}, {}
    -- Read 1st line
    line = r:read("*l")
    for k, v in string.gmatch(line, "(%w+)=(%w+)") do
        t1[k] = tonumber(v)
    end

    -- Read 2nd line
    line = r:read("*l")
    for k, v in string.gmatch(line, "(%w+)=(%w+)") do
        t2[k] = tonumber(v)
    end

    -- Read 3rd line
    line = r:read("*l")
    for k, v in string.gmatch(line, "(%w+)=(%w+)") do
        t3[k] = tonumber(v)
    end

    -- Read 4th line
    line = r:read("*l")
    for k, v in string.gmatch(line, "(%w+)=(%w+)") do
        t4[k] = tonumber(v)
    end

    -- Read chars
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

    print("Total chars:", last)
    local charIdx = {}
    for i = 1, last do
        local s = string.pack("H", 0)
        table.insert(charIdx, s)
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

        local off = mf((v.xoffset + p) * S)
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
    end

    local w = io.open(fnt_name .. ".abc", "w+b")
    
    -- Write header
    w:write(string.pack("I4", 9))               -- version
    w:write(string.pack("f", t1.size * S))      -- height, not used?
    w:write(string.pack("f", 0.0))              -- outlineX, not used
    w:write(string.pack("f", 0.0))              -- outlineY, not used
    w:write(string.pack("f", t2.lineHeight * S)) -- line height
    w:write(string.pack("I4", mf(t2.base * S))) -- base
    w:write(string.pack("I4", 11))              -- spacingX
    w:write(string.pack("I4", 11))              -- spacingY
    w:write(string.pack("I4", 0))               -- zero?
    w:write(string.pack("I4", t2.scaleW * S))   -- texture width
    w:write(string.pack("I4", t2.scaleH * S))   -- texture height

    -- Write charCount
    w:write(string.pack("I4", last))
    w:write(table.concat(charIdx))

    -- Write charDataCount
    w:write(string.pack("I4", t4.count + 1))

    -- Write glyphs
    local c = chars[SF]
    w:write(string.pack("f", c[1]))
    w:write(string.pack("f", c[2]))
    w:write(string.pack("f", c[3]))
    w:write(string.pack("f", c[4]))
    w:write(string.pack("h", c[5]))
    w:write(string.pack("h", c[6]))
    w:write(string.pack("h", c[7]))
    w:write(string.pack("h", c[8]))

    for i = 1, last do
        local c = chars[i]
        if c then
            w:write(string.pack("f", c[1]))
            w:write(string.pack("f", c[2]))
            w:write(string.pack("f", c[3]))
            w:write(string.pack("f", c[4]))
            w:write(string.pack("h", c[5]))
            w:write(string.pack("h", c[6]))
            w:write(string.pack("h", c[7]))
            w:write(string.pack("h", c[8]))
        end
    end

    w:write(string.pack("I4", 0))   -- WTF???
    w:close()
end


-- Main process
for k, v in pairs(Fonts) do
    for kk, vv in ipairs(v) do
        io.write(k .. vv.suffix .. ": ")
        for _, size in ipairs(vv.size) do
            io.write(size .. " ")
            -- Read and process .fnt
            local fnt_name = "./fonts_new/" .. k .. vv.suffix .. "_" .. size
            process_char_data(fnt_name, 4.0, -164)
        end
        io.write("\n")
    end
end

print("[LOG OK] Font descriptors are ready.")
