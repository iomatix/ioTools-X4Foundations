package.path = "./?.lua;./lua/?.lua"
require("mod_binary_writer")
require("config_fonts")

for k, v in pairs(Fonts) do
    for kk, vv in ipairs (v) do
        io.write(k .. vv.suffix .. ": ")
        for _, size in ipairs(vv.size) do
            io.write(size .. " ")
            -- read .fnt
            local fnt_name = "./fonts_new/" .. k .. vv.suffix .. "_" .. size
            local r = assert(io.open(fnt_name .. ".fnt"))

            local line = ""
            local t1, t2, t3, t4, t5 = {}, {}, {}, {}, {}
            local chars = {}
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
                last = t.id
            end
            r:close()
    
            local x0 = 8.0 / t2.scaleW
            local y0 = 8.0 / t2.scaleH
            for i = 1, last do
                local t = {x0, y0, x0+x0, y0+y0, 0, 0, x0, 0}
                table.insert(chars, t)
            end
    
            for k, v in ipairs(t5) do
                local x0 = v.x / t2.scaleW
                local y0 = v.y / t2.scaleH
                local x1 = v.width / t2.scaleW + x0
                local y1 = v.height / t2.scaleH + y0
                local id = v.id
                chars[id][1] = x0
                chars[id][2] = y0
                chars[id][3] = x1
                chars[id][4] = y1
                chars[id][5] = v.xoffset
                chars[id][6] = v.width
                chars[id][7] = 2 * t1.outline + v.xadvance  -- dirty hack
                chars[id][8] = v.page
            end
    
    
            local w = BinaryWriter
            w:open(fnt_name .. ".abc")
    
            -- header
            w:uint32(8)
            w:float(t1.size)
            w:float(t1.outline)
            w:float(t1.outline)
            w:float(t2.lineHeight)
            w:uint32(t2.base)
            w:uint32(math.floor(t2.lineHeight / 4)) -- TODO: what's this???
            w:uint32(math.floor(t2.base / 4))       -- TODO: what's this???
            w:uint32(0)
            w:uint32(t2.scaleW)
            w:uint32(t2.scaleH)
            
            
            -- 30*2 0x00
            w:uint32(last)
            for i = 1, 30 do
                w:uint16(0)
            end
    
            -- other chars
            for i = 0, last-1-30 do
                w:uint16(i)
            end
    
            w:uint32(last-30)
            for i = 31, last do
                local v = chars[i]
                w:float(v[1])
                w:float(v[2])
                w:float(v[3])
                w:float(v[4])
                w:sint16(v[5])
                w:sint16(v[6])
                w:sint16(v[7])
                w:sint16(v[8])
            end
            w:close()
        end
        io.write("\n")
    end
end
