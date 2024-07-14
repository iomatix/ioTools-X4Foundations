package.path = "./?.lua;./lua/?.lua"
require("mod_bmfc")
require("config_fonts")

for k, v in pairs(Fonts) do

    for kk, vv in ipairs (v) do

        for kkk, vvv in ipairs(vv.size) do
            local content = generate(
                v.fontname, 
                vv.new_size[kkk], 
                vv.bold, 
                vv.outline,
                vv.width[kkk], 
                vv.height[kkk]
            )
            --print("fonts_new/" .. k .. vv.suffix .. "_" .. vvv .. ".bmfc")
            local w = assert(io.open("fonts_new/" .. k .. vv.suffix .. "_" .. vvv .. ".bmfc", "w+b"))
            w:write(content)
            w:close()
        end

    end

end
