Camera = require("camera")

local lg = love.graphics
local scale = 1.0

-- dir separator must be '\', not '/'
FNT = arg[2] or [[fonts\rufont_32.abc]]


local char = {}
local img

local function loadImg(path)
    local r = assert(io.open(path, "r+b"))
    local data = r:read("*a")
    r:close()
    data = love.filesystem.newFileData(data, "tmp.ext")
    data = love.image.newImageData(data)
    return data
end


local ext = FNT:sub(-3)
if "abc" == ext then
    local charD = require("x4_abc2t")
    
    local path = FNT:sub(1, -4) .. "png"
    img = loadImg(path)

    local hdr = charD[#charD]
    for i = 0, #charD-1 do
        local c = charD[i]
        table.insert(char, {c.x0, c.y0, c.width, hdr[1], c.off, c.adv})
    end

elseif "fnt" == ext then
    local charT = require("x4_fnt2t")

    local path = charT[3].file
    path = FNT:gsub("([^\\]+)$", path)
    print(FNT, path)
    img = loadImg(path)

    local h = charT[2].lineHeight
--    local h = charT[1].size
    local p = charT[1].padding
    for i = 1, #charT[5] do
        local c = charT[5][i]
        table.insert(char, {c.x+p, c.y+p, c.width-p-p, h, p-c.xoffset, c.xadvance})
    end

else
    assert(false)
end


local dds
local X, Y = 0, 0

function love.load()
    lg.setDefaultFilter("linear", "nearest")
    img = lg.newImage(img)

    lg.setDefaultFilter("linear", "linear")
    lg.setLineWidth(1)

    X, Y = img:getDimensions()
    camera = Camera(X/2, Y/2, 1.0)

    lg.setPointSize(1)
end

function love.draw()
    lg.setColor(1.0, 1.0, 1.0)
    lg.setBackgroundColor(0.5, 0.5, 0.5, 1.0)

    camera:attach()
    lg.draw(img)
    lg.rectangle("line", 0, 0, img:getDimensions())
    for i = 1, #char do
        local c = char[i]
        lg.setLineWidth(1.0)

        lg.setColor(0.3, 1.0, 0.3, 0.6)
        lg.rectangle("line", c[1], c[2], c[3], c[4])

        lg.setColor(0.1, 0.1, 1.0, 0.3)
        lg.rectangle("fill", c[1]-c[5], c[2], c[5], c[4])

        lg.setColor(1.0, 0.1, 0.5, 0.3)
        lg.rectangle("fill", c[1]+c[3], c[2], c[6]-c[3], c[4])
    end
    camera:detach()
end

local zoom = {4, 0.125, 0.25, 0.5, 1, 2, 4, 8, 16}

function love.mousereleased(x, y, b)
    if 1 == b then
        x, y = camera:worldCoords(x, y)
        camera:lookAt(x, y)
    elseif 3 == b then
        zoom[1] = 4
        camera:lookAt(X/2, Y/2)
        camera.scale = zoom[5]
    end
end

function love.wheelmoved(x, y)
    local z = zoom[1]
    if y > 0 then
        if z < 8 then z = z + 1 end
    elseif y < 0 then
        if z > 1 then z = z - 1 end
    end
    zoom[1] = z
    camera.scale = zoom[z+1]
end

function love.keyreleased(k)
    if "escape" == k then
        love.event.quit()
    end
end
