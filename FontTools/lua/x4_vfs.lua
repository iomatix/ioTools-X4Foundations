local conf = require("x4_config")
local vfs = {}

local function exist(filename)
    local f = io.open(filename, "rb")
    return f and f:close()
end

local function cache_vfs()
    local fn = ("%s/version.dat"):format(conf.res_dir)
    local ver
    if exist(fn) then
        local r = io.open(fn)
        ver = tonumber(r:read("l"))
        r:close()
    else
        io.stderr:write("file not found: ", fn, "\n")
        os.exit(false)
    end

    local vfs = { fn = {}, path = arg[1], ver = ver }
    local cache = {"# this is generated content"}
    table.insert(cache, "return {")
    local i = 1
    while true do
        fn = ("%s/%02d.cat"):format(conf.res_dir, i)
        if not exist(fn) then break end

        io.write(("%02d "):format(i))
        local off = 0
        for line in io.lines(fn) do
            for n, s, t, m in string.gmatch(line, "(.+) (%d+) (%d+) (%x+)$") do
                n = string.lower(n)
                s = tonumber(s)
                t = tonumber(t)
                vfs.fn[n] = {i, off, s, t, m}
--                table.insert(cache, ("[%q]={%d,%d,%d,%d,%q},"):format(n, i, off, s, t, m))
                table.insert(cache, ("[%q]={%d,%d,%d},"):format(n, i, off, s))
                off = off + s
            end
        end
        i = i + 1
    end
    io.write("done\n")
    table.insert(cache, "ver=" .. ver .. ",path=\"" .. conf.res_dir .. "\"}")

    local w = io.open("x4_catalog.lua", "w+b")
    local str = table.concat(cache, "\n")
    w:write(str)
    w:close()

    return vfs
end

local function get_file(self, filename)
    local fn = filename:lower()
    local p = self[fn]
    local res
    if p then
        local fn = ("%s/%02d.dat"):format(self.path, p[1])
        local r = io.open(fn, "rb")
        r:seek("set", p[2])
        res = r:read(p[3])
        r:close()
    end
    return res
end

local function generate_vfs()
    local vfs
    io.write("caching vfs...\n")
    vfs = cache_vfs(conf.res_dir)
    vfs.get_file = get_file
    io.write("vfs cached and loaded\n")
    return vfs
end

local function load_vfs()
    io.write("load vfs...\n")
    local vfs = require("x4_catalog")
    vfs.get_file = get_file
    io.write("vfs loaded\n")
    return vfs
end


--[[ init ]]-------------------------------------------------------------------

if not exist("x4_catalog.lua") then
    vfs = generate_vfs()
else
    vfs = load_vfs()
end

return vfs
