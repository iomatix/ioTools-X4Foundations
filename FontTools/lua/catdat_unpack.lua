package.path = "./?.lua;./lua/?.lua"

local cat = assert(arg[1], "[ERR ] no input filename")
local dat = string.gsub(cat, "(.+)%.cat", "%1.dat")
local out = arg[2] or "."

local ffi = require("ffi")
ffi.cdef[[
int _mkdir(const char *path);
char * strerror (int errnum);
]]

local function mkdir(path)
    local err = ffi.C._mkdir(path)
    if err ~= 0 then
        local errno = ffi.errno()
        -- '(17) file exists' is OK
        assert(errno == 17,
            "[ERR ] mkdir failed, errno (" .. errno .. "): " .. ffi.string(ffi.C.strerror(errno)))
    end
end



local files = {}

io.write("[LOG ] open cat...\n")
for line in io.lines(cat) do
    local p = {}
    for l in string.gmatch(line, "%g+") do
        table.insert(p, l)
    end
    local t = {}
    t.hash = table.remove(p)
    t.time = tonumber(table.remove(p))
    t.size = tonumber(table.remove(p))
    local name = table.concat(p, " ")
    t.path = {}
    for s in string.gmatch(name, "([^//]+)") do
        table.insert(t.path, s)
    end
    t.name = table.remove(t.path)
    table.insert(files, t)
end
io.write("[LOG ] " .. #files .. " lines readed\n")


-- collect uniq dirs
io.write("[LOG ] collect all paths...")
local dirs = {}
local count = 0
for k, v in ipairs(files) do
    local d = table.concat(v.path, "\\")
    if not dirs[d] then
        dirs[d] = true
        count = count + 1
    end
end
local dirs_sorted = {}
for k, v in pairs(dirs) do
    table.insert(dirs_sorted, k)
end
io.write(" " .. count .." paths parsed...")


-- make directory tree
dirs = {}
count = 0
for k, v in ipairs(dirs_sorted) do
    local dir = {}
    for s in string.gmatch(v, "[^\\]+") do
        table.insert(dir, s)
    end
    for i, _ in ipairs(dir) do
        local str = ""
        str = table.concat(dir, "\\", 1, i)
        if not dirs[str] then
            dirs[str] = true
            count = count + 1
        end
    end
end
io.write(" founded " .. count .. " unique paths...")

-- sort list again
dirs_sorted = {}
for k, v in pairs(dirs) do
    table.insert(dirs_sorted, k)
end
table.sort(dirs_sorted)
io.write(" and sorted\n")


-- make directories
print("[LOG ] making " .. #dirs_sorted .. " directories...")
for k, v in ipairs(dirs_sorted) do
    mkdir(out .. "\\" .. v)
end


-- unpack
print("[LOG ] unpacking...")
local r = assert(io.open(dat, "rb"))
count = #files
for k, v in ipairs(files) do
    if v.size > 0 then
        local fullpath = table.concat(v.path, "\\") .. "\\" .. v.name
        io.write(string.format("(%d/%d) %s\n", k, count, fullpath))
        local w = assert(io.open(out .. "\\" .. fullpath, "w+b"))
        local data = r:read(v.size)
        w:write(data)
        w:close()
    end
end
r:close()
