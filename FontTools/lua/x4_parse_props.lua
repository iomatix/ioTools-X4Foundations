local conf = require("x4_config")
local vfs = require("x4_vfs")

local header = {}
header["shield"] = {
    f_handle = 0, str = {
        "name", "race", "mk", "recharge", "rate", "delay", "time", "hull",
        "tresh", "int", "macro"
    }
}
header["engine"] = {
    f_handle = 0, str = {
        "name", "mk", "size", "race", "bst_duration", "bst_thrust",
        "trv_duration", "trv_thrust", "trv_attack", "trv_release",
        "thr_forward", "thr_reverse", "hull", "macro"
    }
}
header["thruster"] = {
    f_handle = 0, str = {
        "name", "mk", "thr_strafe", "thr_pitch", "thr_yaw", "thr_roll", "ang_pitch",
        "ang_roll", "macro"
    }
}
header["ship"] = {
    f_handle = 0, str = {
        "basename", "var", "purpose", "type", "class", "hull", "crew",
        "cargo_vol", "cargo_type", "engines", "weapons", "turrets", "shields", "missiles",
        "angar_M", "angar_S", "angar_XS", "dock_M", "dock_S",
        "scan_lvl", "expl_dmg", "mass", "inert_PY", "inert_R",
        "drag_fwd", "drag_rev", "drag_strafe", "drag_PYR", "macro"
    }
}
header["weapon"] = {
    f_handle = 0, str = {
        "basename", "bullet", "reenable", "rot_speed", "rot_accel", "macro"
    }
}
header["missile"] = {
    f_handle = 0, str = {
        "basename", "amount", "lifetime", "range", "guided", "tags", "damage",
        "reload", "resilience", "mass", "i_PY", "i_R", "d_fwd", "d_rev",
        "d_strafe", "d_PY", "d_R", "engine", "macro"
    }
}
header["turret"] = {
    f_handle = 0, str = {
        "basename", "bullet", "rot_speed", "reload_rate", "macro"
    }
}
header["bullet"] = {
    f_handle = 0, str = {
        "macro", "speed", "lifetime", "range", "amount", "barrelamount",
        "maxhits", "ricochet", "scale", "attach", "heat", "reload_time",
        "damage", "system"
    }
}

--[[ lang stuff ]]-------------------------------------------------------------

local L1 = require("0001-L0" .. conf.lang1)
local L2 = conf.lang2 and require("0001-L0" .. conf.lang2)

local FMT = L2 and "%s\r[%s]" or "%s"

local function L_get(p, t, l)
    local function Lget(_, b, c)
        if b == "" then b = p end
        if l then
            return L2[tonumber(b)][tonumber(c)]
        else
            return L1[tonumber(b)][tonumber(c)]
        end
    end
    local s = (p and t) and L[p][t] or p
    local c
    while 0 ~= c do
        -- '{page,id}', '{,id}', '{page, id}', '{, id}'
        s, c = s:gsub("({(%d*),[ ]-(%d+)})", Lget)
        s = s:gsub("\\%(", "<<")
        s = s:gsub("\\%)", ">>")
    end
    s = s:gsub("(%([^%)]+%))", "")  -- убиваем скобки
    s = s:gsub("<<", "(")
    s = s:gsub(">>", ")")

    return s
end

local function L2_get(p)
    return L2 and L_get(p, nil, true) or ""
end


--[[ xml stuff ]]--------------------------------------------------------------

local xml2lua = require("xml2lua")
local xml_tree = require("xmlhandler.tree")

--local function exist(filename)
--    local r = io.open(filename, "rb")
--    return r ~= nil and r:close() or false
--end

local function load_xml(filename)
    local xml, handler
    xml = vfs:get_file(filename)
    if xml then
        handler = xml_tree:new()
        local parser = xml2lua.parser(handler)
        parser:parse(xml)
    end
    return handler
end


--[[ index stuff ]]--------------------------------------------------------

local index

local function parse_index()
    index = loadfile("x4_index.lua")()
end

local function check_zero(val)
    return 0 == val and "--" or tostring(val)
end

local function count_mount(model, mount)
    local fn = index.component[model][2]
    local h = load_xml(fn .. ".xml")
    local c = h.root.components.component
    local e, w, t, s = 0, 0, 0, 0
    local con = c.connections.connection
    for i = 1, #con do
        local c = con[i]
        local tags = c._attr.tags
        for tag in string.gmatch(tags, "[^ ]+") do
            if "engine" == tag then e = e + 1
            elseif "weapon" == tag then w = w + 1
            elseif "turret" == tag then t = t + 1
            elseif "shield" == tag then s = s + 1
            end
        end
    end
    mount[1] = check_zero(e)
    mount[2] = check_zero(w)
    mount[3] = check_zero(t)
    mount[4] = check_zero(s)
end

local function parse_dockarea(m, dock)
    local fn = index.macro[m][2]
    local h = load_xml(fn .. ".xml")
    m = h.root.macros.macro
    local p = m.properties
    local con = m.connections.connection

    local function parse_dock(m, i)
        fn = index.macro[m][2]
        h = load_xml(fn .. ".xml")
        m = h.root.macros.macro
        local p = m.properties
        local d = p.docksize._attr.tags
        dock[d] = dock[d] + 1
    end

    if con then
        local count = #con
        if 0 == count then
            parse_dock(con.macro._attr.ref, 0)
        else
            for j = 1, count do
                parse_dock(con[j].macro._attr.ref, j)
            end
        end
    end
end

local function parse_storage(m, cargo)
    local fn = index.macro[m][2]
    local h = load_xml(fn .. ".xml")
    local p = h.root.macros.macro.properties
    local c = p.cargo._attr
    cargo["vol"] = check_zero(c.max)
    cargo["type"] = c.tags or "--"
    return cargo
end

local function parse_shipstorage(m, hangar)
    local fn = index.macro[m][2]
    local h = load_xml(fn .. ".xml")
    local p = h.root.macros.macro.properties
    local t = p.docksize._attr.tags
    local c = p.dock._attr.capacity
    hangar[t] = hangar[t] + math.floor(c)
end


--[[ parse all macros ]]-------------------------------------------------------

local function t2csv(v, t)
    header[v].f_handle:write("\"", table.concat(t, "\";\""), "\"\n")
end

local function parse_shield(m)
--    print(m._attr.name, m._attr.class)
    if 1 == m._attr.name:find("test") then
        return
    end

    local prop = m.properties
    local t = {}

    local p = prop.identification._attr
--    local fmt = "%s\r[%s]"
    local pn = p.name
    table.insert(t, pn and FMT:format(L_get(pn), L2_get(pn)) or "--")
    table.insert(t, p.makerrace)
    table.insert(t, p.mk)

    p = prop.recharge._attr
    table.insert(t, p.max)
    table.insert(t, p.rate)
    -- (LibreOffice Calc time format)
    table.insert(t, p.delay / 86400)
    table.insert(t, p.max / p.rate / 86400) -- delay to recharge

    p = prop.hull._attr
    table.insert(t, (p.max or "--"))
    table.insert(t, (p.threshold or "--"))
    table.insert(t, (p.integrated or "--"))

    table.insert(t, m._attr.name)

    t2csv("shield", t)
end


local function parse_thruster(m)
--    print(m._attr.name, m._attr.class)
    local prop = m.properties
    local t = {}

    local p = prop.identification and prop.identification._attr or {}
--    local fmt = "%s\r[%s]"
    local pn = p.name
    table.insert(t, pn and FMT:format(L_get(pn), L2_get(pn)) or "--")
    table.insert(t, (p.mk or "--"))

    p = prop.thrust and prop.thrust._attr or {}
    table.insert(t, (p.strafe or "--"))
    table.insert(t, (p.pitch or "--"))
    table.insert(t, (p.yaw or "--"))
    table.insert(t, (p.roll or "--"))

    p = prop.angular and prop.angular._attr or {}
    table.insert(t, (p.pitch or "--"))
    table.insert(t, (p.roll or "--"))

    table.insert(t, m._attr.name)

    t2csv("thruster", t)
end

local function parse_engine(m)
--    print(m._attr.name, m._attr.class)
    local prop = m.properties
    local virt =  prop.component and prop.component._attr.virtual
    if virt and "1" == virt then
        parse_thruster(m)
        return
    end
    local t = {}

    local p = prop.identification and prop.identification._attr or {}
--    local fmt = "%s\r[%s]"
    local pn = p.basename
    table.insert(t, pn and FMT:format(L_get(pn), L2_get(pn)) or "--")
    table.insert(t, (p.mk or "--"))

--  hack: cut engine class from macro name
--  engine_arg_s_combat_01_mk1_macro
--      cut---\ /---cut
    local sz = m._attr.name:gsub("engine_..._(..-)_.+", "%1")
    sz = (#sz > 2) and "--" or sz:upper()
    table.insert(t, sz)

    table.insert(t, (p.makerrace or "--"))

    p = prop.boost and prop.boost._attr or {}
    table.insert(t, (p.duration or "--"))
    table.insert(t, (p.thrust or "--"))

    p = prop.travel and prop.travel._attr or {}
    table.insert(t, p.charge or "--")
    table.insert(t, p.thrust or "--")
    table.insert(t, p.attack or "--")
    table.insert(t, p.release or "--")

    p = prop.thrust and prop.thrust._attr or {}
    table.insert(t, p.forward or "--")
    table.insert(t, p.reverse or "--")

    p = prop.hull and prop.hull._attr or {}
    table.insert(t, p.max or "--")

    table.insert(t, m._attr.name)

    t2csv("engine", t)
end

local word2class = {
    ["small"] = "S",
    ["medium"] = "M",
    ["large"] = "L",
    ["extralarge"] = "XL",
    [" "] = "XS"
}

local function parse_ship(m)
    if 1 == m._attr.name:find("dummy") then
        return
    end

--    print(m._attr.class, m._attr.name)
    local t = {}

    local hangar = {["dock_m"] = 0, ["dock_s"] = 0, ["dock_xs"] = 0}
    local dock = {["dock_m"] = 0, ["dock_s"] = 0}
    local cargo = {["vol"] = 0, ["type"] = 0}
    local mount = {0, 0, 0, 0}

    local con = m.connections.connection

    local model = m.component._attr.ref
    count_mount(model, mount)

    for i = 1, #con do
        local c = con[i]
        local ref = c._attr.ref:sub(5)

        if 1 == ref:find("dockarea") then
            parse_dockarea(c.macro._attr.ref, dock)

        elseif 1 == ref:find("shipstorage") then
            parse_shipstorage(c.macro._attr.ref, hangar)

        elseif 1 == ref:find("storage") then
            parse_storage(c.macro._attr.ref, cargo)

        end
    end
    hangar["dock_m"] = check_zero(hangar["dock_m"])
    hangar["dock_s"] = check_zero(hangar["dock_s"])
    hangar["dock_xs"] = check_zero(hangar["dock_xs"])
    dock["dock_m"] = check_zero(dock["dock_m"])
    dock["dock_s"] = check_zero(dock["dock_s"])
    cargo["vol"] = check_zero(cargo["vol"])
    cargo["type"] = check_zero(cargo["type"])

    local prop = m.properties

    local p = prop.identification and prop.identification._attr or {}
    local b, s = p.basename, p.shortvariation
--    local fmt = "%s\r[%s]"
    if b and s then
        table.insert(t, FMT:format(L_get(b), L2_get(b)))
        table.insert(t, FMT:format(L_get(s), L2_get(s)))
    else
        table.insert(t, FMT:format(L_get(p.name), L2_get(p.name)))
        table.insert(t, "--")
    end

    p = prop.purpose and prop.purpose._attr or {}
    table.insert(t, p.primary)

    p = prop.ship and prop.ship._attr or {}
    table.insert(t, p.type or "--")

    p = prop.thruster and prop.thruster._attr or {}
    table.insert(t, word2class[p.tags] or "XS")

    p = prop.hull and prop.hull._attr or {}
    table.insert(t, p.max)

    p = prop.people and prop.people._attr or {}
    table.insert(t, p.capacity or "--")

    table.insert(t, cargo["vol"] or "--")
    table.insert(t, cargo["type"] or "--")
    table.insert(t, mount[1])
    table.insert(t, mount[2])
    table.insert(t, mount[3])
    table.insert(t, mount[4])

    p = prop.storage and prop.storage._attr or {}
    table.insert(t, p.missile or "--")

    table.insert(t, hangar["dock_m"])
    table.insert(t, hangar["dock_s"])
    table.insert(t, hangar["dock_xs"])

    table.insert(t, dock["dock_m"])
    table.insert(t, dock["dock_s"])

    p = prop.secrecy and prop.secrecy._attr or {}
    table.insert(t, p.level or "--")

    p = prop.explosiondamage and prop.explosiondamage._attr or {}
    table.insert(t, p.value or "--")

    p = (prop.physics and prop.physics._attr) or {}
    table.insert(t, p.mass)

    p = (prop.physics and prop.physics.inertia and prop.physics.inertia._attr) or {}
    local _s = "%s(%s)%s"
    local _p, _y, _r = p.pitch, p.yaw, p.roll
    if _p > _y then
        _p = _s:format(_p, _y, "")
    elseif _p < _y then
        _p = _s:format("", _p, _y)
    end
    table.insert(t, _p)
    table.insert(t, _r)

    p = (prop.physics and prop.physics.drag and prop.physics.drag._attr) or {}
    table.insert(t, p.forward)
    table.insert(t, p.reverse)

    local _h, _v = p.horizontal, p.vertical
    if _h > _v then
        _h = _s:format(_h, _v, "")
    elseif _h < _v then
        _h = _s:format("", _h, _v)
    end
    table.insert(t, _h)

    _p, _y, _r = p.pitch, p.yaw, p.roll
    if _p > _r then
        _p = _s:format(_p, _r, "")
    elseif _y < _r then
        _p = _s:format(_y, _r, "")
    end
    table.insert(t, _p)

    table.insert(t, m._attr.name)

    t2csv("ship", t)
end

local function parse_weapon(m)
    print(m._attr.name, m._attr.class)
    local prop = m.properties
    local t = {}

    local p = prop.identification._attr
    local pn = p.name
    table.insert(t, pn and FMT:format(L_get(pn), L2_get(pn)) or "--")

    p = prop.bullet._attr
    table.insert(t, p.class)

    p = prop.heat and prop.heat._attr or {}
--    table.insert(t, p.overheat or "--")  -- = 10000
--    table.insert(t, p.cooldelay or "--") -- = 1.13
--    table.insert(t, p.coolrate or "--")  -- = 2000
    table.insert(t, p.reenable or "--")

    p = prop.rotationspeed and prop.rotationspeed._attr or {}
    table.insert(t, p.max or "--")

    p = prop.rotationacceleration and prop.rotationacceleration._attr or {}
    table.insert(t, p.max or "--")

--    p = prop.reload and prop.reload._attr or {}
--    table.insert(t, p.rate or "--")
--    table.insert(t, p.time or "--")

    table.insert(t, m._attr.name)

    t2csv("weapon", t)
end

local function parse_missile(m)
    print(m._attr.name, m._attr.class)
    local prop = m.properties
    local t = {}

    local p = prop.identification._attr
    local pn = p.name
    table.insert(t, pn and FMT:format(L_get(pn), L2_get(pn)) or "--")

--    p = prop.ammunition._attr -- always = 1
--    table.insert(t, p.value)

    p = prop.missile._attr
    table.insert(t, p.amount)
--    table.insert(t, p.barrelamount) -- always = 1
    table.insert(t, p.lifetime)
    table.insert(t, p.range)
    table.insert(t, p.guided)
    table.insert(t, p.tags) -- guided, dumbfire, torpedo

    p = prop.explosiondamage._attr
    table.insert(t, p.value)

    p = prop.reload._attr
    table.insert(t, p.time)

--    p = prop.weapon._attr -- missile_guided, missile_dumbfire, torpedo
--    table.insert(t, p.system)

    p = prop.countermeasure._attr
    table.insert(t, p.resilience)

    p = prop.physics._attr
    table.insert(t, p.mass)

    p = prop.physics.inertia._attr
    table.insert(t, p.pitch)
--    table.insert(t, p.yaw) -- = pitch
    table.insert(t, p.roll)

    p = prop.physics.drag._attr
    table.insert(t, p.forward)
    table.insert(t, p.reverse)
    table.insert(t, p.horizontal)
--    table.insert(t, p.vertical) -- = horizontal
    table.insert(t, p.pitch)
--    table.insert(t, p.yaw) -- = pitch
    table.insert(t, p.roll)

    local con = m.connections.connection
    if 0 == #con then
        local ref = con._attr.ref
        if 1 == ref:find("con_eng") then
            table.insert(t, con.macro._attr.ref)
        end
    else
        for j = 1, #con do
            local ref = con[i]._attr.ref
            if 1 == ref:find("con_eng") then
                table.insert(t, con[i].macro._attr.ref)
            end
        end
    end

    table.insert(t, m._attr.name)

    t2csv("missile", t)
end

local function parse_turret(m)
    print(m._attr.name, m._attr.class)
    local prop = m.properties
    local t = {}

    local p = prop.identification._attr
    local pn = p.name
    table.insert(t, pn and FMT:format(L_get(pn), L2_get(pn)) or "--")

    p = prop.bullet._attr
    table.insert(t, p.class)

    p = prop.rotationspeed._attr
    table.insert(t, p.max)

    p = prop.reload._attr
    table.insert(t, p.rate)
--    table.insert(t, p.time) -- = 1 (turret_kha_m_beam_01_mk1_macro = 4)

    table.insert(t, m._attr.name)

    t2csv("turret", t)
end

local function parse_bullet(m)
    print(m._attr.name, m._attr.class)
    local prop = m.properties
    local t = {}

    table.insert(t, m._attr.name)

    local p = prop.bullet._attr
    table.insert(t, p.speed or "--")
    table.insert(t, p.lifetime or "--")
    table.insert(t, p.range or "--")
    table.insert(t, p.amount or "--")
    table.insert(t, p.barrelamount or "--")
    table.insert(t, p.maxhits or "--")
    table.insert(t, p.ricochet or "--")
    table.insert(t, p.scale or "--")
    table.insert(t, p.attach or "--")

    p = prop.heat and prop.heat._attr
    table.insert(t, (p and p.initial or "--"))

    p = prop.reload._attr
    table.insert(t, p.time or "--")

    p = prop.damage._attr
    table.insert(t, p.value or "--")

    p = prop.weapon and prop.weapon._attr
    table.insert(t, (p and p.system or "--"))

    t2csv("bullet", t)
end

local function parse_macro(macro, class)
    local m = macro._attr
--    if m then
    if "shieldgenerator" == class then
        if 1 ~= m.name:find("test") then
            parse_shield(macro)
        end
    elseif "engine" == class then
        if 1 == m.name:find("eng") then
            parse_engine(macro)
        elseif 1 == m.name:find("thr") then
            parse_thruster(macro)
        end
    elseif class and "ship_" == class:sub(1, 5) then
        if 1 ~= m.name:find("dummy") then
            parse_ship(macro)
        end
    end
--    end
end

local check_macro = {
    ["shieldgenerator"] = parse_shield,
    ["engine"] = parse_engine,
    ["weapon"] = parse_weapon,
    ["missile"] = parse_missile,
    ["turret"] = parse_turret,
    ["bullet"] = parse_bullet,
--    ["missilelauncher"] = parse_missilelauncher,
    ["ship_xs"] = parse_ship,
    ["ship_s"] = parse_ship,
    ["ship_m"] = parse_ship,
    ["ship_l"] = parse_ship,
    ["ship_xl"] = parse_ship,
    ["NO_CLASS"] = nil
}

local function parse_start()
    for k, v in pairs(index.macro) do
        local f = check_macro[v[1]]
        if f then
            local h = load_xml(v[2] .. ".xml")
            local macro = h.root.macros.macro
            local count = #macro
            if 0 == count then
                f(macro)
            else
                -- all needed macros are in single file
                --for j = 1, count do
                --    f(macro[j])
                --end
            end
        end

    end
end


--[[ main ]]-------------------------------------------------------------------

for k, v in pairs(header) do
    v.f_handle = io.open(k .. ".csv", "w+b")
    v.f_handle:write("\"", table.concat(v.str, "\";\""), "\"\n")
end

parse_index()
parse_start()

for _, v in pairs(header) do
    v.f_handle:close()
end
