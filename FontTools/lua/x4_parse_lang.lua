local conf = require("x4_config")
local vfs = require("x4_vfs")

local lang = { "07", "33", "34", "39", "44", "49", "55", "81", "82", "86", "88" }


--[[ ]]------------------------------------------------------------------------

local xml2lua = require("xml2lua")
local handler = require("xmlhandler.tree")

local out
local function wr(k, v)
    if v then
        out:write("[" .. k .. "]=[=[" .. v .. "]=],\n")
    else
        out:write(k)
    end
end

for i = 1, #lang do
    print("lang:", lang[i])
    local xml = vfs:get_file("t/0001-L0" .. lang[i] .. ".xml")
    if not xml then goto skip end
    local h = handler:new()
    local parser = xml2lua.parser(h)
    parser.options.stripWS = true
    parser.options.expandEntities = false
    parser.options.errorHandler = function(err, pos) print("\n", err .. "\n", pos .. "\n") end
    parser:parse(xml)

    out = assert(io.open("0001-L0" .. lang[i] .. ".lua", "wb"))
    local l = h.root.language
    wr("local lang={\n")

    local page = l.page
    for i = 1, #page do
        local p = page[i]
        local pid = p._attr.id
        wr("-- page\n[" .. pid .. "]={\n")
        local t = p.t
        if #t > 1 then
            for j = 1, #t do
                local tj = t[j]
                wr(tj._attr.id, tj[1])
            end
        else
            wr(t._attr.id, t[1])
        end
        wr("}, -- page[" .. pid .. "]\n")
    end
    wr("} -- lang\nreturn lang\n")
    out:close()

    ::skip::
end
