local filename = FNT

local r = assert(io.open(filename))

local line = ""
local t = { {}, {}, {}, {}, {} }

-- 1st line
line = r:read("*l")
for k, v in string.gmatch(line, "(%w+)=(%w+)") do
    t[1][k] = tonumber(v)
end

-- 2nd line
line = r:read("*l")
for k, v in string.gmatch(line, "(%w+)=(%w+)") do
    t[2][k] = tonumber(v)
end

-- 3rd line
line = r:read("*l")
for id, f in string.gmatch(line, "page id=(%d+) file=(.+)") do
    f = f:gsub("\"", "")
    t[3] = { ["id"] = tonumber(id), ["file"] = f }
end

-- 4rd line
line = r:read("*l")
for c in string.gmatch(line, "chars count=(%d+)") do
    t[4] = { ["count"] = tonumber(c) }
end

-- chars
local last = 0
for i = 1, t[4].count do
    line = r:read("*l")
    local tt = {}
    for k, v in string.gmatch(line, "(%a+)=([-%d]+)") do
        tt[k] = tonumber(v)
    end
    table.insert(t[5], tt)
end

r:close()

return t
