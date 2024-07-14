package.path = "./?.lua;./lua/?.lua"
require("mod_bmfc_x4")
require("config_fonts")

local success, config_fonts = pcall(require, "config_fonts")
if not success then
    print("Error loading config_fonts.lua:", config_fonts)
    return
end

for k, v in pairs(Fonts) do

    for kk, vv in ipairs (v) do

        for kkk, vvv in ipairs(vv.new_size) do
            local content = generate(
                v.fontname, 
                vv.new_size[kkk], 
                vv.bold, 
                vv.italic, 
                vv.outline,
                vv.width[kkk], 
                vv.height[kkk]
            )
            
            print("generated_fonts/" .. v.fontname .. vv.suffix .. "_" .. vvv .. ".bmfc")
            local w = assert(io.open("generated_fonts/" .. v.fontname .. vv.suffix .. "_" .. vvv .. ".bmfc", "w+b"))
            w:write(content)
            w:close()
        end

    end

end
