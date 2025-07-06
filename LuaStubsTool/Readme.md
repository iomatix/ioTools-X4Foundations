# X4 Lua Stub Generator

This repository contains a simple toolset for auto-generating Lua API stub files for X4 Foundations modding. It scans all `.lua` files in your unpacked game directory (`_unpacked`), extracts global function definitions, and produces a `x4_api_stubs.lua` file with empty function bodies. Perfect for linters (luacheck), IDE autocompletion (EmmyLua), and CI workflows.

## How to Use

> [!important]
>
> Make sure you’re running on Windows with PowerShell 5.0 or newer. The stub generator relies on PowerShell scripts.

1. **Setup**  
   - Clone or copy this repo into your modding toolset folder, alongside your unpack scripts and the `_unpacked` directory.  
   - Verify that `_unpacked` contains all game scripts (`.lua`).

> [!tip]
>
> If you haven’t unpacked X4 yet, use XRCatTool or your `unpack.bat` to extract **all** `.cat` archives into `_unpacked`.

2. **Generate Stubs**  
   - Simply run:
     ```bat
     gen_stubs.bat
     ```
   - This calls `generate_x4_stubs.ps1`, scans `_unpacked/**/*.lua`, and writes `scripts/x4_api_stubs.lua`.

3. **Configure Your Linter & IDE**  
   - **luacheck**: create or update `.luacheckrc` in your project root:
     ```yaml
     std: lua51
     read_globals:
       - _scripts_/x4_api_stubs.lua
     ```
   - **VSCode + EmmyLua**: add to your workspace `settings.json`:
     ```jsonc
     {
       "Lua.workspace.library": [
         "${workspaceFolder}/scripts/x4_api_stubs.lua"
       ]
     }
     ```

4. **Automate in Your Workflow**  
   - To always have up-to-date stubs after unpacking, add to the end of your `unpack.bat`:
     ```bat
     call gen_stubs.bat
     ```

### News

#### 2025-07-06

> [!note]
>  
> - Initial release: supports both `function Name(...)` and `Name = function(...)` patterns.  
> - Scans the entire `_unpacked` directory for `.lua` files.  
> - Outputs a diagnostic-disabled header for undefined globals compatibility.