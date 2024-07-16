package.path = "./?.lua;./lua/?.lua"
require("mod_bmfc_x4")
require("config_fonts")

local success, config_fonts = pcall(require, "config_fonts")
if not success then
    print("Error loading config_fonts.lua:", config_fonts)
    return nil, "config_fonts.lua is missing"
end

for k, v in pairs(Fonts) do
    for kk, vv in ipairs(v) do
        for kkk, vvv in ipairs(vv.new_size) do
            local content, generate_err = generate(
                v.fontname,
                vv.new_size[kkk],
                vv.scale,
                vv.bold,
                vv.italic,
                vv.outline,
                vv.width[kkk],
                vv.height[kkk]
            )

            if not content then
                print("Error generating content for " .. v.fontname .. vv.suffix .. "_" .. vvv .. ".bmfc:", generate_err)
                os.exit(1)
            else
                local filename = "generated_fonts/" .. v.fontname .. vv.suffix .. "_" .. vvv .. ".bmfc"
                print("Generating", filename)
                
                local w, file_err = io.open(filename, "w+b")
                if not w then
                    print("Error opening file:", file_err)
                    os.exit(1)
                else
                    local write_success, write_err = w:write(content)
                    if not write_success then
                        print("Error writing to file:", write_err)
                        os.exit(1)
                    end
                    w:close()
                end
            end
        end
    end
end
