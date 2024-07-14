package.path = "./?.lua;./lua/?.lua"

local num = arg[2] or "00"
local out = arg[3] or "."

local cat = assert(io.open(out .. "/" .. num .. ".cat", "w+b"))
local dat = assert(io.open(out .. "/" .. num .. ".dat", "w+b"))

local time = os.time()
local endl = string.char(0x0A)

for line in io.lines(arg[1]) do
    for size, md5, name in string.gmatch(line, "(.+)  (.+)  (.+)") do
        name = string.gsub(name, "\\", "/")
        local r = assert(io.open("mod\\" .. name, "rb"))
        local data = r:read(tonumber(size))
        dat:write(data)
        r:close()
        cat:write(string.format("%s %d %d %s\n", name, size, time, md5))
    end
end

cat:close()
dat:close()
